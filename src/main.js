// Import necessary libraries and contract ABIs
import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import marketplaceAbi from "../contract/BookLibrary.abi.json";
import erc20Abi from "../contract/erc20.abi.json";

// Constants for ERC20 decimals, contract addresses, and contract instances
const ERC20_DECIMALS = 18;
const MPContractAddress = "0x8dc37A19cCeF8699BbA6e0Ac582aD31774AdbfF5";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

// Global variables to store contract instances and books data
let kit;
let contract;
let books = [];

// Function to connect Celo wallet using Celo Extension Wallet
const connectCeloWallet = async function () {
  if (window.celo) {
    notification("⚠️ Please approve this DApp to use it.");
    try {
      await window.celo.enable();
      notificationOff();

      const web3 = new Web3(window.celo);
      kit = newKitFromWeb3(web3);

      const accounts = await kit.web3.eth.getAccounts();
      kit.defaultAccount = accounts[0];

      contract = new kit.web3.eth.Contract(marketplaceAbi, MPContractAddress);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.");
  }
};

// Function to approve spending of cUSD tokens
async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress);

  const result = await cUSDContract.methods
    .approve(MPContractAddress, _price)
    .send({ from: kit.defaultAccount });
  return result;
}

// Function to get the cUSD balance of the connected wallet
const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
  document.querySelector("#balance").textContent = cUSDBalance;
};

// Function to retrieve books from the BookLibrary contract
const getBooks = async function () {
  const _booksLength = await contract.methods.getBooksLength().call();
  const _books = [];
  for (let i = 0; i < _booksLength; i++) {
    // Retrieve book details from the contract and create a Promise for each book
    let _book = new Promise(async (resolve, reject) => {
      let p = await contract.methods.getBook(i).call();
      resolve({
        index: i,
        owner: p[0],
        title: p[1],
        author: p[2],
        image: p[3],
        price: new BigNumber(p[4]),
        sold: p[5],
        isRead: p[6],
      });
    });
    _books.push(_book);
  }
  // Wait for all Promise objects to resolve and update the global books variable
  books = await Promise.all(_books);

  // Render the updated books on the marketplace
  renderbooks();
};

// Function to render books on the marketplace
const renderbooks = async () => {
  document.getElementById("marketplace").innerHTML = "";
  books.forEach((_book) => {
    const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = productTemplate(_book);
    document.getElementById("marketplace").appendChild(newDiv);
  });
};

// Function to generate HTML template for a book
function productTemplate(_book) {
  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_book.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 me-2 px-2 py-1 rounded">
        ${_book.sold} Sold
      </div>
      <div class="btn del position-absolute top-0 start-0 bg-danger mt-4 ms-2 px-2 py-1 rounded" data-index=${
        _book.index
      } style="color: #fff;">
        Delete
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_book.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_book.title}</h2>
        <p class="card-text mb-4" style="min-height: 20px; font-weight: 500;">
          By ${_book.author}             
        </p>
        <p class="card-text mt-4">
  I have ${_book.isRead ? "Read" : "Not Read"} this Book
</p>

        <div class="d-grid gap-2">
          <a class="btn read btn-lg btn-outline-dark fs-6 p-3" data-id=${
            _book.index
          }>
            Toggle Read Status
          </a>
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${
            _book.index
          }>
            Buy for ${_book.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          </a>
        </div>
      </div>
    </div>
  `;
}

// Function to generate identicon HTML template for an address
function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL();

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `;
}

// Function to show notifications
function notification(_text) {
  document.querySelector(".alert").style.display = "block";
  document.querySelector("#notification").textContent = _text;
}

// Function to hide notifications
function notificationOff() {
  document.querySelector(".alert").style.display = "none";
}

// Event listener when the window loads
window.addEventListener("load", async () => {
  notification("⌛ Loading...");
  await connectCeloWallet();
  await getBalance();
  await getBooks();
  notificationOff();
});

// Event listener for adding a new book
document
  .querySelector("#newProductBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("newTitle").value,
      document.getElementById("newAuthor").value,
      document.getElementById("newImgUrl").value,
      new BigNumber(document.getElementById("newPrice").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString(),
    ];
    notification(`⌛ Adding "${params[0]}"...`);
    try {
      const result = await contract.methods
        .addBook(...params)
        .send({ from: kit.defaultAccount });
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`🎉 You successfully added "${params[0]}".`);
    getBooks();
  });

// Event listener for buying a book
document.querySelector("#marketplace").addEventListener("click", async (e) => {
  if (e.target.className.includes("buyBtn")) {
    const index = e.target.id;
    notification("⌛ Waiting for payment approval...");
    try {
      await approve(books[index].price);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`⌛ Awaiting payment for "${books[index].title}"...`);
    try {
      const result = await contract.methods
        .buyBook(index)
        .send({ from: kit.defaultAccount });
      notification(`🎉 You successfully bought "${books[index].title}".`);
      getBooks();
      getBalance();
    } catch (error) {
      notification(`⚠️ OOPS! Unable to purchase "${books[index].title}".`);
    }
  }
});

// Event listener for deleting a book
document.querySelector("#marketplace").addEventListener("click", async (e) => {
  if (e.target.className.includes("del")) {
    const index = e.target.dataset.index;
    notification(`⌛ Waiting to delete ${books[index].title}...`);
    try {
      const result = await contract.methods
        .removeBook(index)
        .send({ from: kit.defaultAccount });
      notification(`🎉 You successfully deleted "${books[index].title}".`);
    } catch (error) {
      notification(
        `⚠️ Failed to Delete "${books[index].title}" (Or You don't have right to delete this Book).`
      );
    }
    getBooks();
  }
});

// Event listener for marking a book as read/unread
document.querySelector("#marketplace").addEventListener("click", async (e) => {
  if (e.target.className.includes("read")) {
    const index = e.target.dataset.id;
    let val = books[index].isRead;
    if (!val) {
      notification(`⌛ Waiting to mark ${books[index].title} as Read...`);

      try {
        const result = await contract.methods
          .markAsRead(index)
          .send({ from: kit.defaultAccount });

        notification(
          `🎉 You successfully marked "${books[index].title}" as Read.`
        );
      } catch (error) {
        notification(`⚠️ Failed to mark "${books[index].title}" as Read.`);
      }
    } else {
      notification(`⌛ Waiting to mark ${books[index].title} as UnRead...`);
      try {
        const result = await contract.methods
          .markAsUnread(index)
          .send({ from: kit.defaultAccount });

        notification(
          `🎉 You successfully marked "${books[index].title}" as UnRead.`
        );
        console.log(e.target);
      } catch (error) {
        notification(`⚠️ Failed to mark "${books[index].title}" as Unread.`);
      }
    }
    getBooks();
  }
});
