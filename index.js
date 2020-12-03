const lexicalAnalizer = require('./lexicalAnalizer');
const syntaticAnalizer = require('./syntaticAnalizer');
const semanticAnalizer = require('./semanticAnalizer');
const tree = require('./tree');

const programFile = 'program1.rpp';

(async function main() {
    const tokens = await lexicalAnalizer.run(programFile);
    console.log('######### ANALISE LÉXICA CONCLUIDA COM SUCESSO #############');
    console.log('Tokens: ', tokens);
    console.log('############ ############# \n\n');

    const resultSyntaticAnalizer = syntaticAnalizer.run(tokens, tree.tree);
    tree.tree = resultSyntaticAnalizer.descendants;

    console.log('######### ANALISE SINTÁTICA CONCLUIDA COM SUCESSO #############');

    console.log('\n\n\nARVORE SINTATICA:\n');
    tree.print();

    console.log('\n\n TABELA DE SIMBOLOS:\n');
    console.log(resultSyntaticAnalizer.symbolTable);


    console.log('############ ############# \n\n');


    semanticAnalizer.run(tree, resultSyntaticAnalizer.symbolTable)



    console.log('######### ANALISE SEMANTICA CONCLUIDA COM SUCESSO #############');



}().catch(err => {
    console.log(err);
}));


module.exports = {
    programFile,
}