## Escrow Contract for Fund Transfer

This is a sample Hardhat project for an escrow contract facilitating funds transfer between two parties: the depositor and the beneficiary.

### Contract Functionality

In this contract, three main functions are defined:

1. **Deposit:** 
    - Deposits funds into the escrow, locking them until claimed.
    - Executed by the depositor.
2. **Claim:** 
    - Withdraws funds from the escrow.
    - Requires off-chain release authorization from the beneficiary.
    - Beneficiary's address is kept hidden after claiming to maintain privacy.
    - The recipient address get the funds which is signed by beneficiary with other detials.



### Implementation Details

- The depositor initiates the deposit function to lock funds in escrow.
- The beneficiary signs off-chain to authorize fund release to a specified recipient address.
- Funds are released to the recipient address upon successful claim execution.

### Additional Considerations

- **Verification of Release Fund:** 
    - There's no explicit requirement for the depositor to verify release fund data in the provided task details. Please clarify if such verification is necessary.

- **Deadline for Fund Release:** 
    - There's no mention of a deadline for fund release in the task question. Please confirm if a deadline needs to be added for fund release.

- **Refund function:** 
    - There's no mention of a Refund in the task question. Please confirm if there is any refund function is require, I can add.
    

- **Contract Creation Compliance:**
    - The escrow contract is created according to the task details. Please correct me if any thing is forget or need to implement by myself.

### Prerequisites

- Node version 18 and above.

### Testing the Escrow Contract Functionality

To test the escrow contract functionality, follow these steps:

1. Install dependencies:
    ```shell
    npm install
    ```
2. Compile the contract:
    ```shell
    npx hardhat compile
    ```
3. Start the Hardhat node:
    ```shell
    npx hardhat node
    ```
4. Run the tests:
    ```shell
    npx hardhat test 
    ```

For any further correction  or clarifications please connect me I can do .