const form = document.querySelector("form");
const title = document.getElementById("title");
const description = document.getElementById("description");
const coverImage = document.getElementById("coverImage");
const poster = document.getElementById("poster");
const logo = document.getElementById("logo");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const serverAddress = window.location.origin;

  await fetch(`${serverAddress}/create-series`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: title.value,
      description: description.value,
      coverImage: coverImage.value,
      poster: poster.value,
      logo: logo.value,
    }),
  });

  window.history.back();
});
