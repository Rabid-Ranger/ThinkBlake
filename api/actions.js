module.exports = async function handler(req, res) {
  try {
    const response = await fetch('https://api.github.com/repos/Rabid-Ranger/ThinkBlake/actions/runs?per_page=20', {
      headers: { 'User-Agent': 'Accelerator-OS-verification', 'Accept': 'application/vnd.github+json' }
    });
    const data = await response.json();
    const runs = (data.workflow_runs || []).map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      head_sha: run.head_sha,
      run_number: run.run_number,
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at
    }));
    res.setHeader('Cache-Control','no-store');
    res.status(response.ok ? 200 : response.status).json({runs, message:data.message||null});
  } catch (error) {
    res.status(500).json({error:error.message});
  }
};
