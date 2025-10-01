import prisma from '../src/db/prisma.js';
import Account from '../src/models/Account.js';

describe('Account metadata persistence', () => {
  let user; let institution; let plaidItem;
  beforeAll(async () => {
    await prisma.account.deleteMany();
    await prisma.plaidItem.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.user.deleteMany();
    user = await prisma.user.create({ data: { email: 'meta@example.com' } });
    institution = await prisma.institution.create({ data: { userId: user.id, plaidInstitutionId: 'ins_meta', name: 'Meta Bank' } });
    plaidItem = await prisma.plaidItem.create({ data: { userId: user.id, plaidItemId: 'item_meta', plaidAccessToken: 'enc-token', products: 'transactions', institutionId: institution.id } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('stores name/mask/type/subtype and balances', async () => {
    const created = await Account.createForUser(user.id, {
      plaidItemId: plaidItem.plaidItemId,
      institutionId: institution.id,
      name: 'Primary Checking',
      mask: '1234',
      type: 'depository',
      subtype: 'checking',
      plaidAccountId: 'acc_meta_1',
      balanceCurrent: 1523.45,
      balanceAvailable: 1400.00,
      balanceIsoCurrency: 'USD'
    }, { maxAccountsPerInstitution: 5, maxInstitutionsPerUser: 5 });
    expect(created.name).toBe('Primary Checking');
    const fetched = await prisma.account.findUnique({ where: { id: created.id } });
    expect(fetched.mask).toBe('1234');
    expect(fetched.type).toBe('depository');
    expect(fetched.subtype).toBe('checking');
    expect(fetched.balanceCurrent).toBeCloseTo(1523.45);
    expect(fetched.balanceAvailable).toBeCloseTo(1400.00);
    expect(fetched.balanceIsoCurrency).toBe('USD');
  });
});
