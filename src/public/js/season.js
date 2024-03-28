const form = document.querySelector("form");
const nameInput = document.getElementById("name");
const numberInput = document.getElementById("number");
const select = document.querySelector("select");
const serverAddress = window.location.origin;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await fetch(`${serverAddress}/create-season`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: nameInput.value,
      number: numberInput.value,
      seriesId: select.value,
    }),
  });
  window.history.back();
});
(async () => {
  const series = await (await fetch(`${serverAddress}/get-series`)).json();
  series.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.title;
    select.appendChild(option);
  });
})();
