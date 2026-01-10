
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Get or create a user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'repro-test@example.com',
        id: 'repro-user-id',
        role: 'user',
        membershipType: 'free',
        membershipStatus: 'active'
      }
    });
  }

  console.log('User ID:', user.id);

  // 2. Construct the exact data object used in the API route
  // We use values that match what we see in the screenshot or defaults
  const bookData = {
    userId: user.id,
    title: "WW2 THE EUROPEAN THEATER & ITS PLAYERS",
    category: "EBOOK",
    description: null, // As seen in screenshot
    status: 'draft',
    pageCount: 10,
    pageSize: "6x9", // Default for EBOOK
    systemPrompt: null,
    userPrompt: null,
    styleAdaptation: false,
    imageStyle: null,
    coloringTheme: null,
    authorStyle: null,
    hasAudio: false,
  };

  console.log('Attempting to create book with data:', JSON.stringify(bookData, null, 2));

  try {
    const book = await prisma.book.create({
      data: bookData
    });
    console.log('SUCCESS: Book created!', book.id);
  } catch (e: any) {
    console.error('FAILURE: Prisma Create Error:');
    console.error(e.message);
    if (e.meta) {
      console.error('Meta:', e.meta);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
