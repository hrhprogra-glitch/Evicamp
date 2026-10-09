const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (dirPath.endsWith('.tsx')) {
            callback(dirPath);
        }
    });
}

const targetDir = 'src';

walkDir(targetDir, function(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // We want to match: className="... fixed inset-0 ... bg-something/80 backdrop-blur-sm ..."
    // A simpler approach: replace any "bg-[var(--color-ink)]/80", "bg-black/80", "bg-[#1E293B]/80", etc 
    // AND "backdrop-blur-sm", "backdrop-blur-md" 
    // with the exact desired standard.
    // Actually, we can just find 'fixed inset-0' inside className strings and normalize the classes.

    content = content.replace(/className=(['"{`])([^'"`}]+)(['"`}])/g, (match, p1, p2, p3) => {
        if (p2.includes('fixed') && p2.includes('inset-0')) {
            // Eliminar todas las variaciones de bg de overlay y backdrop-blur
            let classes = p2.split(/\s+/).filter(c => 
                !c.startsWith('bg-black/') && 
                !c.startsWith('bg-[var(--color-ink)]/') && 
                !c.startsWith('bg-[#1E293B]/') &&
                !c.startsWith('backdrop-blur')
            );
            
            // Reinsertar el estilo deseado
            // find the index of "inset-0" to put the new classes right after it
            const insetIdx = classes.indexOf('inset-0');
            if (insetIdx !== -1) {
                classes.splice(insetIdx + 1, 0, 'bg-black/60', 'backdrop-blur-sm');
            } else {
                classes.push('bg-black/60', 'backdrop-blur-sm');
            }

            return `className=${p1}${classes.join(' ')}${p3}`;
        }
        return match;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated modals in ${filePath}`);
    }
});
