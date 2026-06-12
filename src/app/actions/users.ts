"use server"

import { auth } from "../../auth";
import { db } from "../../lib/db";
import { Prisma, Role, UserType } from "../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export interface CreateUserInput {
    username: string;
    password: string;
    role: Role;
    type: UserType;
    phone: string;
}

export async function createUser(input: CreateUserInput) {
    // 1. Auth gate — only Admins may provision new accounts
    const session = await auth();
    if (!session || session.user?.role !== "Admin") {
        return { success: false, error: "Unauthorized: Only Admins can create accounts." };
    }

    const { username, password, role, type, phone } = input;

    // 2. Basic validation
    if (!username || username.trim().length < 3) {
        return { success: false, error: "Username must be at least 3 characters." };
    }
    if (!password || password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters." };
    }
    if (!phone || phone.trim().length < 5) {
        return { success: false, error: "A valid phone number is required." };
    }
    if (role === Role.Admin) {
        return { success: false, error: "Cannot assign Admin role." };
    }

    try {
        // 3. Ensure username is not already taken
        const existing = await db.user.findUnique({ where: { username: username.trim() } });
        if (existing) {
            return { success: false, error: `Username "${username.trim()}" is already taken.` };
        }

        // 4. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Create user
        const newUser = await db.user.create({
            data: {
                username: username.trim(),
                password: hashedPassword,
                role,
                type,
                phone: phone.trim(),
            },
        });

        // 6. Write to audit trail
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "CREATE_USER",
                tableName: "users",
                recordId: newUser.id,
                newValue: {
                    username: newUser.username,
                    role: newUser.role,
                    type: newUser.type,
                } as any,
            },
        });

        revalidatePath("/dashboard/users");
        revalidatePath("/dashboard");

        return { success: true, data: { id: newUser.id, username: newUser.username } };

    } catch (error) {
        console.error("Create user failed:", error);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}


export interface UpdateUserInput {
    userId: string;
    username?: string;
    password?: string;
    role?: Role;
    type?: UserType;
    phone?: string;
}


export async function updateUser(input: UpdateUserInput) {

   const session = await auth();
    if (!session || session.user?.role !== "Admin") {
        return { success: false, error: "Unauthorized: Only Admins can update accounts." };
    }

    const { userId, username, password, role, type, phone } = input;

     try {
        const existing = await db.user.findUnique({ where: { id: userId } });
        if (!existing)
            return { success: false, error: "User not found." };

        // Prevent demoting/modifying other admins
        if (existing.role === Role.Admin && session.user.id !== userId)
            return { success: false, error: "Cannot modify another Admin account." };

        // Check username uniqueness if changing it
        if (username && username.trim() !== existing.username) {
            const taken = await db.user.findUnique({ where: { username: username.trim() } });
            if (taken)
                return { success: false, error: `Username "${username.trim()}" is already taken.` };
        }

        // Build update payload — only include fields that were passed
        const updateData: Prisma.UserUpdateInput = {};
        if (username !== undefined) updateData.username = username.trim();
        if (password !== undefined) updateData.password = await bcrypt.hash(password, 10);
        if (role !== undefined) updateData.role = role;
        if (type !== undefined) updateData.type = type;
        if (phone !== undefined) updateData.phone = phone.trim();
        // if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: updateData,
        });

        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "UPDATE_USER",
                tableName: "users",
                recordId: userId,
                oldValue: {
                    username: existing.username,
                    role: existing.role,
                    type: existing.type,
                    phone: existing.phone,
                    isActive: existing.isActive,
                } as Prisma.InputJsonValue,
                newValue: {
                    username: updatedUser.username,
                    role: updatedUser.role,
                    type: updatedUser.type,
                    phone: updatedUser.phone,
                    isActive: updatedUser.isActive,
                } as Prisma.InputJsonValue,
            },
        });

        revalidatePath("/dashboard/users");
        revalidatePath("/dashboard");

        return { success: true, data: { id: updatedUser.id, username: updatedUser.username } };

    } catch (error) {
        console.error("Update user failed:", error);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}