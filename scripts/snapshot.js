const fs = require('fs');
const path = require('path');

const vitalFiles = ['src', 'media', 'package.json', 'tsconfig.json'];
const snapshotsDir = path.join(__dirname, '..', 'Snapshots');

function getTimestampedFolderName() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `V3_ESTAVEL_${date}_${time}`;
}

async function createSnapshot() {
    const folderName = getTimestampedFolderName();
    const targetDir = path.join(snapshotsDir, folderName);

    console.log(`[SNAPSHOT] Iniciando criação em: ${targetDir}`);

    if (!fs.existsSync(snapshotsDir)) {
        fs.mkdirSync(snapshotsDir);
    }

    fs.mkdirSync(targetDir);

    for (const file of vitalFiles) {
        const sourcePath = path.join(__dirname, '..', file);
        const targetPath = path.join(targetDir, file);

        if (fs.existsSync(sourcePath)) {
            console.log(`[SNAPSHOT] Copiando: ${file}...`);
            // recursive copy available since Node 16.7.0
            fs.cpSync(sourcePath, targetPath, { 
                recursive: true,
                filter: (src) => {
                    return !src.includes('node_modules') && !src.includes('dist');
                }
            });
        } else {
            console.warn(`[SNAPSHOT] Aviso: ${file} não encontrado.`);
        }
    }

    console.log(`[SNAPSHOT] Protocolo concluído com sucesso.`);
}

createSnapshot().catch(err => {
    console.error(`[SNAPSHOT] Erro fatal: ${err.message}`);
    process.exit(1);
});
