
import 'hardhat-typechain';
import '@nomiclabs/hardhat-ethers';
import { HardhatUserConfig } from 'hardhat/types';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.4',
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      gasPrice: 1e9,
    }
  }
};

export default config;
