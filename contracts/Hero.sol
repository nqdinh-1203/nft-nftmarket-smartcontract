// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IHero {
    function mint(address to, uint256 hero_type) external returns (uint256);
}

contract Hero is ERC721Enumerable, Ownable, AccessControlEnumerable, IHero {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIDTracker;
    string private _url;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event Mint(address to, uint256 heroType, uint256 tokenId);

    constructor() ERC721("Stickman Hero", "Hero") {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
    }

    function _baseURI()
        internal
        view
        override
        returns (string memory _newBaseURI)
    {
        return _url;
    }

    function listTokenIDs(
        address _owner
    ) external view returns (uint256[] memory tokenIDs) {
        uint balance = balanceOf(_owner);
        uint256[] memory list = new uint256[](balance);

        for (uint i = 0; i < balance; i++) {
            list[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return list;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(AccessControlEnumerable, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function mint(
        address to,
        uint256 hero_type
    ) external override returns (uint256) {
        require(
            owner() == _msgSender() || hasRole(MINTER_ROLE, _msgSender()),
            "Caller is not minter"
        );
        uint256 token_id = _tokenIDTracker.current();
        _mint(to, token_id);
        _tokenIDTracker.increment();

        emit Mint(to, hero_type, token_id);
        return token_id;
    }

    function setBaseUrl(string memory _newUrl) public {
        _url = _newUrl;
    }
}
