// KiroCópter · pr-size-hint
// Recebe o contexto do hook em stdin (JSON). SEMPRE deixa o push seguir (exit 0).
// Quando o diff passa de 1000 linhas, imprime um AVISO — não bloqueia.
// Determinístico: não usa LLM. Custo R$ 0.
import { execSync } from 'node:child_process';

const HINT_AT = 1000; // acima disso, avisa (não bloqueia)

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  // Só olha git push. Qualquer outro comando passa direto, sem ruído.
  if (!/git\s+push/.test(input)) process.exit(0);

  // Descobre a branch base (main ou master), se existir no remoto.
  let base = 'origin/main';
  try {
    execSync('git rev-parse --verify origin/main', { stdio: 'ignore' });
  } catch {
    try {
      execSync('git rev-parse --verify origin/master', { stdio: 'ignore' });
      base = 'origin/master';
    } catch {
      process.exit(0); // sem base conhecida: nada a avisar
    }
  }

  let lines = 0;
  try {
    const stat = execSync(`git diff --shortstat ${base}...HEAD`, { encoding: 'utf8' });
    const add = Number(/(\d+) insertion/.exec(stat)?.[1] ?? 0);
    const del = Number(/(\d+) deletion/.exec(stat)?.[1] ?? 0);
    lines = add + del;
  } catch {
    process.exit(0); // não conseguiu medir: segue sem avisar
  }

  if (lines > HINT_AT) {
    // Aviso informativo. NÃO bloqueia: o push segue normalmente.
    console.log(
      `KiroCópter pr-size-hint: este PR tem ~${lines} linhas de diff contra ${base} ` +
      `(acima de ${HINT_AT}). Vale considerar quebrar por tarefa da spec para facilitar ` +
      `a revisão. É só um aviso — o push segue normalmente.`,
    );
  }
  process.exit(0); // sempre deixa passar
});
