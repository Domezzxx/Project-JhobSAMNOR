import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  { name: 'Food', nameTh: 'อาหาร', icon: '🍜', color: '#FF6B6B', type: 'expense' },
  { name: 'Shopping', nameTh: 'ช้อปปิ้ง', icon: '🛍️', color: '#845EF7', type: 'expense' },
  { name: 'Transport', nameTh: 'เดินทาง', icon: '🚗', color: '#4DABF7', type: 'expense' },
  { name: 'Bills', nameTh: 'บิล/ค่าบริการ', icon: '🧾', color: '#FFA94D', type: 'expense' },
  { name: 'Entertainment', nameTh: 'บันเทิง', icon: '🎮', color: '#F783AC', type: 'expense' },
  { name: 'Health', nameTh: 'สุขภาพ', icon: '💊', color: '#69DB7C', type: 'expense' },
  { name: 'Salary', nameTh: 'เงินเดือน', icon: '💰', color: '#37B24D', type: 'income' },
  { name: 'OtherIncome', nameTh: 'รายได้อื่น', icon: '✨', color: '#20C997', type: 'income' },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { name_type: { name: c.name, type: c.type } },
      update: {},
      create: c,
    });
  }

  const email = 'demo@bestimove.ai';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash('demo1234', 10),
      displayName: 'สมชาย (Demo)',
      monthlyIncome: 2_500_000, // 25,000 ฿
    },
  });

  const existing = await prisma.transaction.count({ where: { userId: user.id } });
  if (existing === 0) {
    const cat = async (name: string) =>
      (await prisma.category.findFirst({ where: { name, type: 'expense' } }))?.id;
    const samples = [
      { type: 'income', amount: 2_500_000, note: 'เงินเดือน', source: 'manual', categoryId: undefined },
      { type: 'expense', amount: 650_000, note: 'ข้าวเที่ยง + กาแฟ', source: 'manual', categoryId: await cat('Food') },
      { type: 'expense', amount: 420_000, note: 'Shopee', source: 'ocr', categoryId: await cat('Shopping') },
      { type: 'expense', amount: 350_000, note: 'BTS + วิน', source: 'manual', categoryId: await cat('Transport') },
    ];
    for (const s of samples) {
      await prisma.transaction.create({ data: { userId: user.id, ...s } });
    }
  }

  console.log(`✅ Seed complete: ${categories.length} categories · demo user ${email} / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
