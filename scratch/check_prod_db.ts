import { spawn } from 'child_process';

function runSsh(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', [
      '-p', '22022',
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=5',
      'root@143.95.161.39',
      'docker', 'exec', '-i', 'cs2-stats-postgres',
      'psql', '-U', 'cs2stats', '-d', 'cs2stats'
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Exit ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    child.stdin.write(sql);
    child.stdin.end();
  });
}

async function main() {
  const q = await runSsh(`
    SELECT
      jsonb_object_keys(payload) as payload_keys,
      count(*)
    FROM match_payloads
    WHERE "sourceMatchId" = '28120889'
    GROUP BY jsonb_object_keys(payload);
  `);
  console.log('Keys in payload of match 28120889 in PROD:\n', q);

  const q2 = await runSsh(`
    SELECT
      jsonb_array_length(payload->'grenades') as grenades_count,
      jsonb_array_length(payload->'bomb') as bomb_count,
      jsonb_array_length(payload->'economy') as economy_count,
      jsonb_array_length(payload->'damage') as damage_count,
      jsonb_array_length(payload->'kills') as kills_count,
      jsonb_array_length(payload->'rounds') as rounds_count
    FROM match_payloads
    WHERE "sourceMatchId" = '28120889';
  `);
  console.log('Array lengths in payload of match 28120889:\n', q2);
}

main().catch(console.error).finally(() => process.exit(0));
