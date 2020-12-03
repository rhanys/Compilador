const _ = require('lodash');
const errors = [];
let symbolsTable = [];
let currentScope = 'global';

// <EscopoPrincipal>::=<Func>|<Comandos>|ε
function mainScope({children}) {
  if(children.length) {
    analyze(children[0]);
    analyze(children[1]);
  }
  
  return null;
}

// <Func>::='func' id '(' <Parametros>? ')' <Tipagem> <Bloco>
function funcDeclaration({children}) {
  const id  = children[1].token.image;
  const funcType = analyze(children[5]);
  currentScope = id;
  if(_.get(_.find(symbolsTable, {image: id}), 'dataType')) {
    errors.push('Essa função já foi declarada: ' + id);
    throw errors;
  }

  _.set(symbolsTable, `[${_.findIndex(symbolsTable, {image: id})}].dataType`, funcType);
  _.set(symbolsTable, `[${_.findIndex(symbolsTable, {image: id})}].params`, analyze(children[3]));
  analyze(children[6]);
}

/* <Tipo> ::= 'inteiro'
            |'real'
            | 'texto'
            | 'qualquer' */
function dataType({children}) {
  return children[0].token.image;
}

//<Tipagem> ::= ':' <Tipo>
function typing({children}) {
  if(children.length > 0) {
    return analyze(children[1]);
  }

  return 'any';
}

/* <Parametros> ::= <Parametro> <AdicionaParametro>? */
function funcParameters({children}) {
  if(children.length > 0) {
    let paramList = [];
    paramList.push(analyze(children[0]));

    if(children[1]) {
      paramList = paramList.concat(analyze(children[1]));
    }
  }

  return null
}

//<AdicionaParametro> ::= ',' <Parametro> <AdicionaParametro>?
function addParameter({children}) {
  let listParam = [];
  if(children.length > 0) {
    listParam.push(analyze(children[1]));

    if(children[2]) {
      listParam = listParam.concat(analyze(children[2]));
    }
  }
  
  return listParam;
}

// <Parametro> ::= id <Tipagem>?
function funcParameter({children}) {
  const id = children[0].token.image;
	const tipo = analyze(children[1]);
		
  if(!_.get(_.find(symbolsTable, {image: id}), 'dataType')) {
    _.set(symbolsTable, `[${_.findIndex(symbolsTable, {image: id})}].dataType`, tipo);
  }else {
    erros.push('A variável de parametros já foi declarada! Id: ' + id);
  }
  return { id, tipo };
}

// <Bloco> ::= '{' <Comandos>? '}'
function codeBlock({children}) {
  if(children.length > 0) {
    analyze(children[1]);
  }

  return null;
}

//<Comandos> ::=<Comando> <Comando>*
function commands({children}) {
  children.forEach(child => {
    analyze(child);
  })
}

/*
<DeclaracaoVariavel> 
                | <Atribuicao>
                | <Se>
                | <Enquanto>
                | <Retorne>
                | <Entrada>
                | <Saida>
                | <ChamaFunc> ';'
*/
function command({children}) {
  analyze(children[0]);
}

// <DeclaracaoVariavel> ::= 'var' <ID> <Tipagem>?
function declareVar({children}) {
  const id = children[1].children[0].token.image;
  const tipo = children[2] ? analyze(children[2]) : 'any';
  if(!_.get(_.find(symbolsTable, {image: id}), 'dataType')) {
    _.set(symbolsTable, `[${_.findIndex(symbolsTable, {image: id})}].dataType`, tipo);
  }else {
    errors.push('Variável ja foi declarada: ' + id);
    throw errors;
  }

  return null;
}

//<Atribuicao> ::= id '=' <ExpArit>
function varAssign({children}) {
  const id = children[0].token.image;
  const tipo = _.get(_.find(symbolsTable, {image: id}), 'dataType');

  if(tipo) {
    analyze(children[2]);
  } else {
    errors.push('Identificador nao foi declarado: ', id);
    throw errors;
  }
}


function exprArit(node) {
  if(node.token && node.token.class === 'IDENTIFIER') {
    const id = node.token.image;
    const tipo = _.get(_.find(symbolsTable, {image: id}), 'dataType');

    if(!tipo) {
      errors.push('Identificador nao foi declarado: ' + id);
    throw errors;
    }
  }
  if(node.children && node.children.length > 0) {
    node.children.map(child => {
      exprArit(child);
    });
  }
}


function analyze(node) {
  switch (node.name) {
    case '<EscopoPrincipal>':
      return mainScope(node);
    case '<FUNC>':
      return funcDeclaration(node);
    case '<TIPAGEM>':
      return typing(node);
    case '<TYPE>':
      return dataType(node);
    case '<PARAMETROS>':
      return funcParameters(node);
    case '<PARAMETRO>':
      return funcParameter(node);
    case '<ADICIONA_PARAMETRO>':
      return addParameter(node);
    case '<BLOCO>':
      return codeBlock(node);
    case '<COMANDOS>':
      return commands(node);
    case '<COMANDO>':
      return command(node);
    case '<DECLAR_VARIAVEL>':
      return declareVar(node);
    case '<ATRIBUICAO>':
      return varAssign(node);
    case '<EXPR_ARITMET>':
      return exprArit(node);
    default:
      return null;
  }
}



module.exports = {
  run: ({tree}, st) => {
    symbolsTable = st;

    try {
      analyze(tree);
    } catch (err) {
      throw 'Erro: ' + err;
    }

    if(errors.length) {
        console.log('\n\n Error Stack: ', errors);
        console.log('\n');

        throw('Ocorreu um erro durante a compilação');
    }

    return true;
  }
}