import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ courseId: string; sessionId: string }>;
};

export default async function PayloadPage({ params }: Props) {
    const { courseId, sessionId } = await params;
    const user = await getCurrentUser();

    if (!user) return <div>Unauthorized</div>;

    const cid = Number(courseId);
    const sid = Number(sessionId);

    const session = await prisma.classSession.findUnique({
        where: { id: sid },
    });

    if (!session || session.courseId !== cid) {
        notFound();
    }

    // Construct payload example
    // Note: This is a reconstruction of what the QR code might contain.
    // The actual signed token generation happens elsewhere, but this shows the raw data.
    const payloadData = {
        courseId: cid,
        sessionId: sid,
        keyword: session.keyword,
        expiresAt: session.expiresAt,
        // Add other fields if relevant
    };

    return (
        <div className="min-h-screen bg-black text-green-400 p-8 font-mono">
            <h1 className="text-2xl mb-4">Secret Payload View</h1>
            <div className="border border-green-800 p-4 rounded bg-green-900/10">
                <pre>{JSON.stringify(payloadData, null, 2)}</pre>
            </div>
            <p className="mt-4 text-sm text-gray-500">
                This page is for debugging purposes only.
            </p>
        </div>
    );
}
