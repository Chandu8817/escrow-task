// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

/**
 * @title Escrow
 * @dev A contract for handling escrow transactions between multiple parties.
 */
contract Escrow is ReentrancyGuard {
    uint256 public nonce; // Nonce for preventing replay attacks

    // Struct to store beneficiary details
    struct BeneficiaryDetails {
        bytes32 beneficiaryAddress; // Identifier for the beneficiary
        address tokenAddress; // Address of the token (0x0 for ETH)
        uint256 amount; // Amount of tokens/ETH in the escrow
        bool isDeposit; // Flag indicating if the beneficiary has made a deposit
    }

    // Mapping to store beneficiary details by address
    mapping(address => BeneficiaryDetails) public Beneficiaries;

    // Event emitted upon deposit
    event Deposit(bytes32 indexed beneficiary, uint256 amount);

    // Event emitted upon claiming funds
    event Claim(address indexed receiver, uint256 amount);
    event Refund(address indexed receiver, uint256 amount);

    /**
     * @dev Deposit function to add funds to the escrow.
     * @param _beneficiaryAddress Identifier for the beneficiary.
     * @param _tokenAddress Address of the token (0x0 for ETH).
     * @param _amount Amount of tokens/ETH to deposit.
     */
    function deposit(
        bytes32 _beneficiaryAddress,
        address _tokenAddress,
        uint256 _amount
    ) public payable nonReentrant {
        // Ensure the depositer hasn't already made a deposit
        require(!Beneficiaries[msg.sender].isDeposit, "Already in deposit");

        // If deposit is in ETH, verify the amount
        if (_tokenAddress == address(0)) {
            require(msg.value == _amount, "ETH amount is incorrect");
        } else {
            // Deposit is in ERC20 tokens
            require(msg.value == 0, "Save your ETH, this is ERC20");

            IERC20(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                _amount
            );
        }

        // Store beneficiary details
        Beneficiaries[msg.sender] = BeneficiaryDetails(
            _beneficiaryAddress,
            _tokenAddress,
            _amount,
            true
        );

        // Emit deposit event
        emit Deposit(_beneficiaryAddress, _amount);
    }

    /**
     * @dev Claim function to release funds from escrow to a designated recipient.
     * @param _v ECDSA recovery parameter.
     * @param _r ECDSA signature parameter.
     * @param _s ECDSA signature parameter.
     * @param _despositer Address of the depositer.
     * @param _to Address of the recipient.
     */
    function claim(
        uint8 _v,
        bytes32 _r,
        bytes32 _s,
        address _despositer,
        address _to
    ) public nonReentrant {
        require(_to != address(0), "Recipient not be zero");

        // Retrieve beneficiary details
        (
            bytes32 _beneficiaryAddress,
            address _tokenAddress,
            uint256 _amount
        ) = getBeneficiary(_despositer);

        require(
            keccak256(abi.encodePacked(_to)) != _beneficiaryAddress,
            "Recipient not be beneficiary"
        );

        // Generate hash for validating signature
        bytes32 _signedHash = getRelaseFundDataHash(_to, _amount, nonce);

        // Verify signature
        bytes32 beneficiaryAddress = verifySigner(_signedHash, _v, _r, _s);
        require(beneficiaryAddress == _beneficiaryAddress, "Invalid user");

        // Release funds to the designated recipient
        if (_tokenAddress == address(0)) {
            (bool sent, ) = _to.call{value: _amount}("");
            require(sent, "Failed to send Ether");
        } else {
            require(
                IERC20(_tokenAddress).transfer(_to, _amount),
                "Failed to claim ERC20"
            );
        }

        // Delete beneficiary details after claiming funds
        delete Beneficiaries[_despositer];

        // Increment nonce to prevent replay attacks
        nonce++;

        // Emit claim event
        emit Claim(_to, _amount);
    }

    /**
     * @dev Function to generate hash for releasing funds data.
     * @param _to Address of the recipient.
     * @param _amount Amount of tokens/ETH to release.
     * @param _nonce Nonce value.
     * @return Hash of the releasing funds data.
     */
    function getRelaseFundDataHash(
        address _to,
        uint256 _amount,
        uint256 _nonce
    ) public pure returns (bytes32) {
        bytes32 _realseFundHash = keccak256(
            abi.encodePacked(_to, _amount, _nonce)
        );
        return _realseFundHash;
    }

    /**
     * @dev Function to verify the signer of a signature.
     * @param _signedHash Hash of the signed data.
     * @param _v ECDSA recovery parameter.
     * @param _r ECDSA signature parameter.
     * @param _s ECDSA signature parameter.
     * @return Address of the signer.
     */
    function verifySigner(
        bytes32 _signedHash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    ecrecover(
                        keccak256(
                            abi.encodePacked(
                                "\x19Ethereum Signed Message:\n32",
                                _signedHash
                            )
                        ),
                        _v,
                        _r,
                        _s
                    )
                )
            );
    }

    /**
     * @dev Function to get beneficiary details.
     * @param _despositer Address of the depositer.
     * @return Beneficiary details.
     */
    function getBeneficiary(
        address _despositer
    ) internal view returns (bytes32, address, uint256) {
        BeneficiaryDetails memory _beneficiaryDetails = Beneficiaries[
            _despositer
        ];

        return (
            _beneficiaryDetails.beneficiaryAddress,
            _beneficiaryDetails.tokenAddress,
            _beneficiaryDetails.amount
        );
    }
}
