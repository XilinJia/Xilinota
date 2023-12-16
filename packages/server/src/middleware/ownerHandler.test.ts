import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, koaAppContext, koaNext } from '../utils/testing/testUtils';
import ownerHandler from './ownerHandler';

describe('ownerHandler', () => {

	beforeAll(async () => {
		await beforeAllDb('ownerHandler');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should login user with valid session ID', async () => {
		const { user, session } = await createUserAndSession(1, false);

		const context = await koaAppContext({
			sessionId: session.id,
		});

		context.xilinota.owner = null;

		await ownerHandler(context, koaNext);

		expect(!!context.xilinota.owner).toBe(true);
		expect(context.xilinota.owner.id).toBe(user.id);
	});

	test('should not login user with invalid session ID', async () => {
		await createUserAndSession(1, false);

		const context = await koaAppContext({
			sessionId: 'ihack',
		});

		context.xilinota.owner = null;

		await ownerHandler(context, koaNext);

		expect(!!context.xilinota.owner).toBe(false);
	});

});
