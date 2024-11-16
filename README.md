# ENS Domain Rental Contract

A smart contract system that enables ENS domain owners to rent out their domains for a specified duration. This contract supports both wrapped (ERC1155) and unwrapped (ERC721) ENS names.

## Features

### Domain Listing
- Owners can list their ENS domains for rent
- Set a price per second in ETH
- Define a maximum end date for rentals
- Supports both wrapped and unwrapped ENS domains
- Automatic handling of domain custody during rental period

### Domain Renting
- Renters can lease domains for any period up to the maximum end date
- Pay-per-second pricing model
- Automatic refund of excess payments
- Instant transfer of ENS name control to renter
- Protection against rental period overlaps

### Safety Features
- Automatic validation of domain expiry
- Protection against zero prices
- Validation of rental end dates
- Checks for active rental periods
- Safe handling of both ERC721 and ERC1155 tokens
- Proper ETH transfer safety checks

### Domain Management
- Lenders can reclaim domains after rental period
- Recovery mechanism for expired rentals
- Automatic return of domain control
- Clear rental terms tracking

## Technical Details

### Contract Architecture
The system consists of three main components:
1. Base Registrar Interface (ERC721)
2. Name Wrapper Interface (ERC1155)
3. ENS Registry Interface

### Key Structs

```solidity
struct RentalTerms {
    address lender;          // Domain owner
    uint256 pricePerSecond;  // Rental price in wei/second
    uint256 maxEndTimestamp; // Maximum rental end date
    address currentBorrower; // Current renter
    uint256 rentalEnd;      // Current rental end time
    bytes32 nameNode;       // ENS node hash
}
```

### Main Functions

#### List Domain
```solidity
function listDomain(
    uint256 tokenId,
    uint256 pricePerSecond,
    uint256 maxEndTimestamp,
    bytes32 nameNode
) external
```

#### Rent Domain
```solidity
function rentDomain(
    uint256 tokenId,
    uint256 desiredEndTimestamp
) external payable
```

#### Reclaim Domain
```solidity
function reclaimDomain(
    uint256 tokenId
) external
```

## Events

```solidity
event DomainListed(uint256 indexed tokenId, address indexed lender, uint256 pricePerSecond, uint256 maxEndTimestamp, bytes32 nameNode);
event DomainRented(uint256 indexed tokenId, address indexed borrower, uint256 rentalEnd, uint256 totalPrice);
event DomainReclaimed(uint256 indexed tokenId, address indexed lender);
```

## Error Handling

The contract includes custom errors for better gas efficiency and clearer error messages:
- `ZeroPriceNotAllowed()`
- `MaxEndTimeMustBeFuture()`
- `MaxEndTimeExceedsExpiry()`
- `DomainNotListed()`
- `ExceedsMaxEndTime()`
- And more...

## Usage Examples

### List a Domain for Rent
```solidity
// List domain for 0.0001 ETH per second until Dec 31, 2024
contract.listDomain(
    tokenId,
    100000000000000, // 0.0001 ETH in wei
    1735689600,      // Dec 31, 2024
    nameNode
);
```

### Rent a Domain
```solidity
// Rent domain until Nov 1, 2024
contract.rentDomain{value: 1 ether}(
    tokenId,
    1698796800  // Nov 1, 2024
);
```

## Security Considerations

- Contract holds ENS domains during rental periods
- Implements reentrancy protection
- Safe ETH transfer handling
- Proper access control for domain operations
- Validation of all time-based parameters
- Protection against rental overlap

## Dependencies

- OpenZeppelin Contracts
  - ERC721Holder
  - ERC1155Holder

## License
MIT License