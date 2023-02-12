// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract HeroMarketplace is IERC721Receiver, Ownable {
    using SafeERC20 for IERC20;
    IERC721Enumerable private nft;
    IERC20 private token;

    struct ListDetail {
        address payable author;
        uint256 price;
        uint256 tokenId;
    }

    event ListNFT(address indexed _from, uint256 _tokenId, uint256 _price);
    event UnlistNFT(address indexed _from, uint _tokenId);
    event BuyNFT(address indexed _from, uint256 _tokenId, uint256 _price);
    event UpdateListingNFTPrice(uint256 _tokenId, uint256 _price);
    event SetToken(IERC20 _token);
    event SetTax(uint256 _tax);
    event SetNFT(IERC721Enumerable _nft);

    uint256 private tax = 10; //percentage
    mapping(uint256 => ListDetail) listDetail;

    constructor(IERC20 _token, IERC721Enumerable _nft) {
        nft = _nft;
        token = _token;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return (
            bytes4(
                keccak256("onERC721Received(address, address, uint256, bytes)")
            )
        );
    }

    function setTax(uint256 _newTax) public onlyOwner {
        tax = _newTax;
        emit SetTax(_newTax);
    }

    function setToken(IERC20 _token) public onlyOwner {
        token = _token;
        emit SetToken(_token);
    }

    function setNFT(IERC721Enumerable _nft) public onlyOwner {
        nft = _nft;
        emit SetNFT(_nft);
    }

    function getListNFT() public view returns (ListDetail[] memory) {
        uint balance = nft.balanceOf(address(this));
        ListDetail[] memory myNFTs = new ListDetail[](balance);

        for (uint i = 0; i < balance; i++) {
            myNFTs[i] = listDetail[nft.tokenOfOwnerByIndex(address(this), i)];
        }

        return myNFTs;
    }

    // Đẩy NFT từ user lên Marketplace
    function listNFT(uint256 _tokenId, uint256 _price) public {
        require(
            nft.ownerOf(_tokenId) == msg.sender,
            "You are not owner of this NFT"
        );
        require(
            nft.getApproved(_tokenId) == address(this),
            "Marketplace is not approved to transfer this NFT"
        );

        listDetail[_tokenId] = ListDetail(
            payable(msg.sender),
            _price,
            _tokenId
        );

        nft.safeTransferFrom(msg.sender, address(this), _tokenId);
        emit ListNFT(msg.sender, _tokenId, _price);
    }

    function updateListingNFTPrice(uint256 _tokenId, uint _newPrice) public {
        require(
            nft.ownerOf(_tokenId) == address(this),
            "This NFT is not existed on Marketplace"
        );
        require(
            listDetail[_tokenId].author == msg.sender,
            "Only owner can update price of this NFT"
        );

        listDetail[_tokenId].price = _newPrice;

        emit UpdateListingNFTPrice(_tokenId, _newPrice);
    }

    function unlistNFT(uint256 _tokenId) public {
        require(
            nft.ownerOf(_tokenId) == address(this),
            "This NFT is not existed on Marketplace"
        );
        require(
            listDetail[_tokenId].author == msg.sender,
            "Only owner can unlist this NFT"
        );

        nft.safeTransferFrom(address(this), msg.sender, _tokenId);
        emit UnlistNFT(msg.sender, _tokenId);
    }

    function buyNFT(uint _tokenId, uint256 _price) public {
        require(
            token.balanceOf(msg.sender) >= _price,
            "Insufficient account balance"
        );
        require(
            nft.ownerOf(_tokenId) == address(this),
            "This NFT is not existed on Marketplace"
        );
        require(
            listDetail[_tokenId].price <= _price,
            "Minimum price has not been reached"
        );

        SafeERC20.safeTransferFrom(token, address(this), msg.sender, _price);
        token.transfer(
            listDetail[_tokenId].author,
            (_price * (100 - tax)) / 100
        );
        token.transfer(address(this), (_price * tax) / 100);

        nft.safeTransferFrom(address(this), msg.sender, _tokenId);
        listDetail[_tokenId].author = payable(msg.sender);

        emit BuyNFT(msg.sender, _tokenId, _price);
    }

    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function withdrawToken(uint256 amount) public onlyOwner {
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient Marketplace balance"
        );
        token.transfer(msg.sender, amount);
    }

    function withdrawERC20() public onlyOwner {
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }
}
