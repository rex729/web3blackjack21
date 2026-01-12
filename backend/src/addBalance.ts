import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const amount = parseInt(process.argv[3]);

    if (!email || isNaN(amount)) {
        console.error('Usage: ts-node addBalance.ts <email> <amount>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                balance: {
                    increment: amount
                }
            }
        });
        console.log(`Successfully added ${amount} to ${email}. New balance: ${user.balance}`);
    } catch (error) {
        console.error('Error updating balance:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
