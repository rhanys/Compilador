const lineReader = require('line-reader');

const classifiers = {
    RESERVED_WORD: 'RESERVED_WORD',
    DELIMITERS: 'DELIMITERS',
    ARITHMETIC_OPERATORS: 'ARITHMETIC_OPERATORS',
    BOOL_OPERATORS: 'BOOL_OPERATORS',
    ASSIGNMENT_OPERATORS: 'ASSIGNMENT_OPERATORS',
    LITERAL_INTEGER: 'LITERAL_INTEGER',
    LITERAL_FLOAT: 'LITERAL_FLOAT',
    LITERAL_STRING: 'LITERAL_STRING',
    IDENTIFIER: 'IDENTIFIER'
}


let tokens = [];
let lineCount = 0;
let columnCount = 0;
const errors = [];

const symbolClassifiers = {
    [classifiers.RESERVED_WORD]: [
        'func',
        'inteiro',
        'real',
        'texto',
        'qualquer',
        'var',
        'se',
        'senao',
        'retorne',
        'leia',
        'escreva',
    ],
    [classifiers.DELIMITERS]: [
        '(',
        ')',
        '{',
        '}',
        ':',
        ';',
        ',',
    ],
    [classifiers.ARITHMETIC_OPERATORS]: [
        '+',
        '-',
        '*',
        '/',
    ],
    [classifiers.BOOL_OPERATORS]: [
        '==',
        '!=',
        '>',    
        '>=',
        '<',
        '<=',
        '!=',
    ],
    [classifiers.ASSIGNMENT_OPERATORS]: [
        '=',
        '+=',
        '-=',
        '/=',
        '*=',
    ]
}

const tokenize = (originalLine) => {

    line = originalLine;
        
    if(line.trim() === '' || line.trim().startsWith('#')) {
        return;
    }

    line = line.replace(/\s{2,}(?=([^']*'[^']*')*[^']*$)/g, ' ');

    let splitRegex = [
        /(func [A-z][A-z, 0-9]*)/ig,
        /(:\s*inteiro|real|texto|qualquer)/ig,
        /(se(?=\())/ig,
        /(senao(?=\{))/ig,
        /(enquanto(?=\())/ig,
        /(leia(?=\())/ig,
        /(escreva(?=\())/ig,
        /(\(|\)|\{|\})/ig,
        /(\,|\;|\:)/ig,
        /(\+|\-|\*|\/)/ig,
        /\<=|\>=|\==|\!=|\<|\>/ig,
    ];

    splitRegex.map(regex => {
        line = line.replace(regex, " $1 ");
    })

    line = line.replace(/\s{2,}(?=([^']*'[^']*')*[^']*$)/g, ' ');
    const spaceSplitRegex = /\s(?!.*')|(?<!'.*)\s/g;

    tokens = tokens.concat(line.split(spaceSplitRegex)
        .filter(str => str && str.trim() !== '')
        .map((str, idx) => {
            return {
                image: str,
                line: lineCount,
                column: getColumn(originalLine, str),
            }
        }));
    
};


const getColumn = (line, token) => {
    columnCount += line.substring(columnCount).indexOf(token);
    return columnCount + 1;
}

const wordClassifier = () => {
    tokens = tokens.map((token) => {
        if(symbolClassifiers[classifiers.RESERVED_WORD].indexOf(token.image) > -1) {
            token.class = classifiers.RESERVED_WORD;
        } else if(symbolClassifiers[classifiers.DELIMITERS].indexOf(token.image) > -1) {
            token.class = classifiers.DELIMITERS;
        } else if(symbolClassifiers[classifiers.ARITHMETIC_OPERATORS].indexOf(token.image) > -1) {
            token.class = classifiers.ARITHMETIC_OPERATORS;
        } else if(symbolClassifiers[classifiers.BOOL_OPERATORS].indexOf(token.mage) > -1) {
            token.class = classifiers.BOOL_OPERATORS;
        } else if(symbolClassifiers[classifiers.ASSIGNMENT_OPERATORS].indexOf(token.image) > -1) {
            token.class = classifiers.ASSIGNMENT_OPERATORS;
        } else if(token.image.match(/^\d\d*/)) {
            token.class = classifiers.LITERAL_INTEGER;
        } else if(token.image.match(/^\d*.\d\d*/)) {
            token.class = classifiers.LITERAL_FLOAT;
        } else if(token.image.match(/'.*'/)) {
            token.class = classifiers.LITERAL_STRING;
        } else if(token.image.match(/[A-z][A-z, 0-9]*/)) {
            token.class = classifiers.IDENTIFIER;
        } else {
            token.error = 'Invalid Token';
            errors.push(token);
        }

        return token;
    })
}



module.exports = {

    run: (file) => {
        return new Promise((resolve, reject) => {
            lineReader.eachLine(file, function(line, last) {
                lineCount++;
                columnCount = 0;

                tokenize(line);
                
                if(last) {
                    tokens.length && wordClassifier();
                    if(errors.length) {
                        reject(errors);
                    }

                    resolve(tokens);
                }

            });
        }).catch(errs => {
            throw new Error(`Ocorreram os seguintes erros durante o processo de compilação: \n [ERRORS]=>${JSON.stringify(errs)}`);
        });
        
    },

    symbolClassifiers,
    classifiers,
}