import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: true },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile
        ? {
            name: user.profile.name,
            gender: user.profile.gender,
            age: user.profile.age,
            height: user.profile.height,
            weight: user.profile.weight,
            activityLevel: user.profile.activityLevel,
            trainingLevel: user.profile.trainingLevel,
            goalType: user.profile.goalType,
            locale: user.profile.locale,
            theme: user.profile.theme,
          }
        : null,
    },
  });
}
