// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

// ERC-20 Token Interface
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

// BookLibrary contract
contract BookLibrary {
    uint256 internal booksLength = 0;
    address internal cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    // Struct to represent a book
    struct Book {
        address payable owner;
        string title;
        string author;
        string image;
        uint256 price;
        uint256 sold;
        bool isRead;
    }

    // Mapping to store books by index
    mapping(uint256 => Book) internal books;

    // Function to add a new book to the library
    function addBook(
        string memory _title,
        string memory _author,
        string memory _image,
        uint256 _price
    ) public {
        uint256 _sold = 0;
        // Create a new book and add it to the mapping
        books[booksLength] = Book(
            payable(msg.sender),
            _title,
            _author,
            _image,
            _price,
            _sold,
            false
        );

        // Increment the total number of books
        booksLength++;
    }

    // Function to get the total number of books in the library
    function getBooksLength() public view returns (uint256) {
        return booksLength;
    }

    // Function to get details of a specific book by index
    function getBook(uint256 _index)
        public
        view
        returns (
            address payable,
            string memory,
            string memory,
            string memory,
            uint256,
            uint256,
            bool
        )
    {
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

    // Function to remove a book from the library by index
    function removeBook(uint256 _index) public {
        require(_index < booksLength, "Invalid index.");
        require(
            msg.sender == books[_index].owner,
            "You can only remove your own books."
        );

        // Move the next book to the index to be deleted
        for (uint256 i = _index; i < booksLength - 1; i++) {
            books[i] = books[i + 1];
        }

        // Delete the last book (optional, as it will be overwritten in the next step)
        delete books[booksLength - 1];

        // Decrease the length of the array
        booksLength--;
    }

    // Function to mark a book as read by index
    function markAsRead(uint256 _index) public {
        // require(msg.sender == books[_index].owner, "You can only mark your own books.");
        books[_index].isRead = true;
    }

    // Function to mark a book as Unread by index
    function markAsUnread(uint256 _index) public {
        // require(msg.sender == books[_index].owner, "You can only mark your own books.");
        books[_index].isRead = false;
    }

    // Function to buy a book by index
    function buyBook(uint256 _index) public payable {
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
