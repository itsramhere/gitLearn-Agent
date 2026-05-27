async function fetchSample() {
  const res = await fetch('https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/issues?state=opened&per_page=1');
  const text = await res.text();
  console.log(JSON.stringify(JSON.parse(text)[0], null, 2));
}

fetchSample().catch(console.error);
