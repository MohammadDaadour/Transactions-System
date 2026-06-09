import LoginForm from "../../components/LoginForm";
import { auth } from "../../auth";
import { redirect } from "next/navigation";


export default async function Login() {

    const session = await auth();
    if (session) redirect("/dashboard");
    return (
        <div className="space-y-8">
            <LoginForm />
        </div>
    )

};