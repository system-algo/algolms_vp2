export async function runPythonCode(code, options = {}) {
  const { onOutput } = options;

  const source = String(code || '');
  const outputLines = [];

  function emit(value) {
    const text = String(value ?? '');
    outputLines.push(text);

    if (typeof onOutput === 'function') {
      onOutput(text);
    }
  }

  try {
    const lines = source.split('\n');

    lines.forEach((line) => {
      const match = line.match(/^\s*print\s*\((.*)\)\s*$/);
      if (!match) return;

      const expression = match[1].trim();

      if (
        (expression.startsWith("'") && expression.endsWith("'")) ||
        (expression.startsWith('"') && expression.endsWith('"'))
      ) {
        emit(`${expression.slice(1, -1)}\n`);
        return;
      }

      emit(`${expression}\n`);
    });

    if (outputLines.length === 0) {
      emit('Program executed. Output preview is limited in this replica.\n');
    }

    return {
      ok: true,
      stdout: outputLines.join(''),
      stderr: '',
    };
  } catch (error) {
    return {
      ok: false,
      stdout: outputLines.join(''),
      stderr: error?.message || 'Runtime error.',
    };
  }
}