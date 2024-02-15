import Web3 from "web3"
import { newKitFromWeb3 } from "@celo/contractkit"
import BigNumber from "bignumber.js"
import marketplaceAbi from "../contract/BookLibrary.abi.json"
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18
const MPContractAddress = "0x247e486c949C428831F59917927cBF2714E614C2"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit
let contract
let books = []

const connectCeloWallet = async function () {
  if (window.celo) {
    notification("⚠️ Please approve this DApp to use it.")
    try {
      await window.celo.enable()
      notificationOff()

      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(marketplaceAbi, MPContractAddress)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.")
  }
}

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(MPContractAddress, _price)
    .send({ from: kit.defaultAccount })
  return result
}

const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  document.querySelector("#balance").textContent = cUSDBalance
}

const getBooks = async function () {
  const _booksLength = await contract.methods.getBooksLength().call()
  const _books = []
  for (let i = 0; i < _booksLength; i++) {
    let _book = new Promise(async (resolve, reject) => {
      let p = await contract.methods.getBook(i).call()
      resolve({
        index: i,
        owner: p[0],
        title: p[1],
        author: p[2],
        image: p[3],
        price: new BigNumber(p[4]),
        sold: p[5],
        isRead: p[6],
      })
    })
    _books.push(_book)
  }
  books = await Promise.all(_books)

  renderbooks()
}

const renderbooks = async () => {
  const undeletedbooks = books.filter(product => !product.deleted);

  document.getElementById("marketplace").innerHTML = "";
  undeletedbooks.forEach(_book => {
    const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = productTemplate(_book);
    document.getElementById("marketplace").appendChild(newDiv);
  });
};

function productTemplate(_book) {
  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_book.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 me-2 px-2 py-1 rounded">
        ${_book.sold} Sold
      </div>
      <div class="btn del position-absolute top-0 start-0 bg-danger mt-4 ms-2 px-2 py-1 rounded" data-index=${_book.index
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
  I have ${_book.isRead ? 'Read' : 'Not Read'} this Book
</p>

        <div class="d-grid gap-2">
          <a class="btn read btn-lg btn-outline-dark fs-6 p-3" data-id=${_book.index}>
            Toggle Read Status
          </a>
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${_book.index}>
            Buy for ${_book.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          </a>
        </div>
      </div>
    </div>
  `
}

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

function notification(_text) {
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}

window.addEventListener("load", async () => {
  notification("⌛ Loading...")
  await connectCeloWallet()
  await getBalance()
  await getBooks()
  notificationOff()
});


document
  .querySelector("#newProductBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("newTitle").value,
      document.getElementById("newAuthor").value,
      document.getElementById("newImgUrl").value,
      new BigNumber(document.getElementById("newPrice").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString()
    ]
    notification(`⌛ Adding "${params[0]}"...`)
    try {
      const result = await contract.methods
        .addBook(...params)
        .send({ from: kit.defaultAccount })
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`🎉 You successfully added "${params[0]}".`)
    getBooks()
  })

document.querySelector("#marketplace").addEventListener("click", async (e) => {
  if (e.target.className.includes("buyBtn")) {
    const index = e.target.id
    notification("⌛ Waiting for payment approval...")
    try {
      await approve(books[index].price)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Awaiting payment for "${books[index].title}"...`)
    try {
      const result = await contract.methods
        .buyBook(index)
        .send({ from: kit.defaultAccount })
      notification(`🎉 You successfully bought "${books[index].title}".`)
      getBooks()
      getBalance()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  }
})

document.querySelector('#marketplace').addEventListener('click', async (e) => {
  if (e.target.className.includes("del")) {
    const index = e.target.dataset.index;
    notification(`⌛ Waiting to delete ${books[index].title}...`);
    try {
      const result = await contract.methods.removeBook(index).send({ from: kit.defaultAccount });
      notification(`🎉 You successfully deleted "${books[index].title}".`);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    getBooks();
  }
});



document.querySelector('#marketplace').addEventListener('click', async (e) => {
  if (e.target.className.includes("read")) {
    const index = e.target.dataset.id;
    let val = books[index].read
    if (!val) {
      notification(`⌛ Waiting to mark ${books[index].title} as Read...`);


      try {
        const result = await contract.methods.markAsRead(index).send({ from: kit.defaultAccount });

        notification(`🎉 You successfully marked "${books[index].title}" as Read.`);
      } catch (error) {
        notification(`⚠️ ${error}.`);
      }
    } else {
      notification(`⌛ Waiting to mark ${books[index].title} as UnRead...`);
      try {
        const result = await contract.methods.markAsUnRead(index).send({ from: kit.defaultAccount });

        notification(`🎉 You successfully marked "${books[index].title}" as UnRead.`);
        console.log(e.target);
      } catch (error) {
        notification(`⚠️ ${error}.`);
      }
    }
    getBooks();

  }
});