function normalizeName(name) {
    if (!name) return '';
    const prepositions = ['da', 'de', 'di', 'do', 'du', 'das', 'dos', 'e'];
    
    return name.trim().split(/\s+/).map((word, index) => {
        const lowerWord = word.toLowerCase();
        if (prepositions.includes(lowerWord) && index !== 0) {
            return lowerWord;
        }
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    }).join(' ');
}

function generateUniqueUsername(fullName, userModel) {
    const prepositions = ['da', 'de', 'di', 'do', 'du', 'das', 'dos', 'e'];
    const nameParts = fullName.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .split(/\s+/)
        .filter(part => !prepositions.includes(part));
    
    if (nameParts.length < 2) return null;
    
    const first = nameParts[0];
    let username = first + '.' + nameParts[nameParts.length - 1];
    
    // Tenta usar os nomes do meio de trás para frente em caso de colisão
    let attemptIndex = nameParts.length - 1;
    
    while (userModel.findByUsername(username)) {
        attemptIndex--;
        if (attemptIndex > 0) {
            // Tenta o nome anterior (ex: se patrick.ramos falhar, tenta patrick.souza)
            username = first + '.' + nameParts[attemptIndex];
        } else {
            // Se acabaram os nomes do meio, volta para o padrão e adiciona número (ex: patrick.ramos2)
            let counter = 2;
            let baseUsername = first + '.' + nameParts[nameParts.length - 1];
            username = baseUsername + counter;
            while (userModel.findByUsername(username)) {
                counter++;
                username = baseUsername + counter;
            }
            break;
        }
    }
    
    return username;
}

module.exports = { normalizeName, generateUniqueUsername };
