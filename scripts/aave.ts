
import '@nomiclabs/hardhat-ethers';
import * as dotenv from 'dotenv';
import { LogDescription } from 'ethers/lib/utils';
import hre from 'hardhat';
import { IERC20__factory, MyV2CreditDelegation__factory } from '../typechain';

dotenv.config();

// Infura, Alchemy, ... however you can get access to the Kovan test network
// E.g. https://kovan.infura.io/v3/<project-id>
const KOVAN_JSON_RPC = process.env.KOVAN_JSON_RPC || '';
if (!KOVAN_JSON_RPC) {
    console.error('Forgot to set KOVAN_JSON_RPC in aave.ts or .env');
    process.exit(1);
}

// Test account that has Kovan ETH and an AAVE token balance
const AAVE_HOLDER = '0xA9B62C680C945397dC23fc15D66460D48005D4E1';

async function main() {
    // Fork Kovan
    await hre.network.provider.request({
        method: 'hardhat_reset',
        params: [{ forking: { jsonRpcUrl: KOVAN_JSON_RPC } }],
    });

    // Act like AAVE_HOLDER
    await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [AAVE_HOLDER],
    });
    const signer = await hre.ethers.getSigner(AAVE_HOLDER);
    console.log('signer:', signer.address);

    // AAVE token on Kovan network
    const token = IERC20__factory.connect('0xb597cd8d3217ea6477232f9217fa70837ff667af', signer);
    console.log('token balance:', (await token.balanceOf(signer.address)).toString());

    const MyV2CreditDelegation = new MyV2CreditDelegation__factory(signer);
    const delegation = await MyV2CreditDelegation.deploy({ gasLimit: 1e7 });
    console.log('delegation:', delegation.address);

    await token.approve(delegation.address, 1000000000000);
    console.log('allowance:', (await token.allowance(signer.address, delegation.address, { gasLimit: 1e6 })).toString());

    const depositTrans = await delegation.depositCollateral(token.address, 1000000000000, true, { gasLimit: 1e6 });
    console.log('depositTrans:', depositTrans.hash);
    const receipt = await depositTrans.wait();
    for (const log of receipt.logs) {
        const [name, desc] = parseLog(log) || [];
        if (desc) {
            const args = desc.eventFragment.inputs.map(({ name, type, indexed }, index) =>
                `\n    ${type}${indexed ? ' indexed' : ''} ${name}: ${desc.args[name]}`);
            args.unshift(`\n    contract ${name} ${log.address}`);
            console.log('Event', log.logIndex, `${desc.name}(${args ? args.join(',') : ''})`);
        } else {
            console.log('Log', log.logIndex, JSON.stringify(log.topics, null, 4), JSON.stringify(log.data));
        }
    }

    function parseLog(log: { address: string, topics: Array<string>, data: string }): [string, LogDescription] | undefined {
        try { return ['', delegation.interface.parseLog(log)]; } catch (e) { }
        try {
            const desc = token.interface.parseLog(log);
            return [log.address.toLowerCase() === token.address.toLowerCase() ? 'AAVE' : 'IERC20', desc];
        } catch (e) { }
    }
}

main().then(() => process.exit(0), error => {
    console.error(JSON.stringify(error));
    console.error(error);
});
