const form = document.querySelector("form");
const input = document.querySelector("input");
const seriesSelect = document.getElementById("series");
const seasonSelect = document.getElementById("season");
const nyaaInput = document.getElementById("nyaa_query");
const tmdbInput = document.getElementById("tmdb_id");
const endDate = document.getElementById("end_date");
const serverAddress = window.location.origin;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await fetch(`${serverAddress}/auto-episode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      seriesId: seriesSelect.value,
      seasonId: seasonSelect.value,
      nyaaQuery: nyaaInput.value,
      tmdbId: tmdbInput.value,
      endDate: endDate.value,
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
    seriesSelect.appendChild(option);
  });
  await onChange();
})();

const onChange = async () => {
  const season = await (
    await fetch(`${serverAddress}/get-season`, {
      method: "POST",
      body: JSON.stringify({
        seriesId: seriesSelect.value,
      }),
    })
  ).json();
  season.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    seasonSelect.appendChild(option);
  });
};

seriesSelect.addEventListener("change", onChange);
