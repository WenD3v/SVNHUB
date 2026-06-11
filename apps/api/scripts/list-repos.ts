import { PrismaClient } from "@prisma/client";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const repos = await prisma.repository.findMany({
    select: { id: true, slug: true, name: true, svnPath: true },
  });
  console.log(JSON.stringify(repos, null, 2));
  await prisma.$disconnect();
}

void main();
