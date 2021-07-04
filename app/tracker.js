const signalR = require("@microsoft/signalr");

const HENTracker = () => {
  const RECONNECT_INTERVAL = 60000;

  const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://api.tzkt.io/v1/events")
    .build();

  const init = async () => {
    try {
      // Open connection
      await connection.start();
      // Subscribe to account transactions
      await connection.invoke("SubscribeToOperations", {
        address: "KT1Hkg5qeNhfwpKW4fXvq7HGZB9z2EnmCCA9",
        types: "transaction",
      });
    } catch (error) {
      setTimeout(init, RECONNECT_INTERVAL);
    }
  };

  // Auto-reconnect
  connection.onclose(() => setTimeout(init, RECONNECT_INTERVAL));

  let onMintedCallback = null;
  let onSwappedCallback = null;

  const onMinted = (callback) => {
    onMintedCallback = callback;
  };

  const handleMint = (transaction) => {
    let senderAddress = transaction.initiator.address;
    let objktId = parseInt(transaction.parameter.value.token_id);

    if (onMintedCallback != null) {
      onMintedCallback(senderAddress, objktId);
    }
  };

  const onSwapped = (callback) => {
    onSwappedCallback = callback;
  };

  const handleSwap = (transaction) => {
    let senderAddress = transaction.sender.address;
    let objktId = parseInt(transaction.parameter.value.objkt_id);

    if (onSwappedCallback != null) {
      onSwappedCallback(senderAddress, objktId);
    }
  };

  connection.on("operations", (response) => {
    const transactions = response.data;
    if (transactions == null) {
      return;
    }

    transactions.forEach((transaction) => {
      if (transaction.parameter == null) {
        return;
      }

      const action = transaction.parameter.entrypoint;
      if (action == "mint") {
        handleMint(transaction);
      } else if (action == "swap") {
        handleSwap(transaction);
      }
    });
  });

  init();

  return { onMinted, onSwapped };
};

module.exports = HENTracker;
