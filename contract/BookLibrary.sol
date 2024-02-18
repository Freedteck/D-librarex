// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract BookLibrary {

    uint internal booksLength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    struct Book {
        address payable owner;
        string title;
        string author;
        string image;
        uint price;
        uint sold;
        bool isRead;
    }

    mapping(uint => Book) internal books;

    function addBook(
        string memory _title,
        string memory _author,
        string memory _image,
        uint _price
    ) public {
        uint _sold = 0;
        books[booksLength] = Book(
            payable(msg.sender),
            _title,
            _author,
            _image,
            _price,
            _sold,
            false
        );
        booksLength++;
    }

    function getBooksLength() public view returns (uint) {
        return booksLength;
    }

    function getBook(uint _index) public view returns (
        address payable,
        string memory, 
        string memory, 
        string memory,
        uint, 
        uint,
        bool
    ) {
        return (
            books[_index].owner,
            books[_index].title,
            books[_index].author,
            books[_index].image,
            books[_index].price,
            books[_index].sold,
            books[_index].isRead
        );
    }

    function removeBook(uint _index) public {
        require(msg.sender == books[_index].owner, "You can only remove your own books.");
        books[_index] = books[booksLength - 1];
        booksLength--;
    }

    function markAsRead(uint _index) public {
        require(msg.sender == books[_index].owner, "You can only mark your own books.");
        books[_index].isRead = true;
    }

    function markAsUnread(uint _index) public {
        require(msg.sender == books[_index].owner, "You can only mark your own books.");
        books[_index].isRead = false;
    }

    function buyBook(uint _index) public payable {
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            books[_index].owner,
            books[_index].price
          ),
          "Transfer failed."
        );
        books[_index].sold++;
    }
}
