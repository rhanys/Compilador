const symbolClassifiers = require('./lexicalAnalizer').symbolClassifiers;
const classifiers = require('./lexicalAnalizer').classifiers;

const PRIMITIVE_TYPES = ['inteiro', 'real', 'texto', 'qualquer'];

const symbolTable = [];
const errors = [];

let tokens = [];
let tree = {};

let currentToken = {};
let pToken = 0;
let scope = 'global';

const getSyntaxError = (waiting, token) => {
    return new Error (`Um(a) '${waiting}' era esperado(a), ao invés disso foi encontrado um(a) ${token.image}`);
}

const getToken = () => {
    if(currentToken && currentToken.class === classifiers.IDENTIFIER && 
        !symbolTable.find(symbol => symbol.image === currentToken.image && symbol.scope === scope)
    ) {
        symbolTable.push({ image: currentToken.image, scope, type: null, params:[]});
    }

    currentToken = tokens[pToken];
    pToken++;
}

const lookAhead = (nAhead) => nAhead ? tokens[pToken+(nAhead-1)] : tokens[pToken];

const addParam = () => {
    const node =  {name: '<ADICIONA_PARAMETRO>', children:[]};
    getToken();


    if(currentToken.image === ',' ){
        node.children.push({name: currentToken.image, children:[], token: currentToken});
        node.children.push(param());


        if(lookAhead().image === ',') {
            node.children.push(addParam());
        }

    } else {
        errors.push(getSyntaxError(',', currentToken));
    }

    return node;

}

const param = () => {
    const node =  {name: '<PARAMETRO>', children:[]};
    getToken();

    if(currentToken.class === classifiers.IDENTIFIER) {
        node.children.push({name: `${classifiers.IDENTIFIER}=>${currentToken.image}`, children:[], token: currentToken});

        if(lookAhead().image === ':') {
            node.children.push(dataType());
        }


    } else {
        errors.push(getSyntaxError(classifiers.IDENTIFIER, currentToken));
    }

    return node;

}

const funcParams = () => {
    const node =  {name: '<PARAMETROS>', children:[]};

    if(lookAhead().class === classifiers.IDENTIFIER) {
        node.children.push(param());

        if(lookAhead().image === ',') {
            node.children.push(addParam());
        }

    }else {
        return false; //nao tem parametros
    }
    
    return node;
   
}

const primitiveType = () => {
    const node =  {name: '<TYPE>', children:[]};
    getToken();

    if(PRIMITIVE_TYPES.indexOf(currentToken.image) > -1) {
        node.children.push({name: currentToken.image, children:[], token: currentToken})
    } else {
        errors.push(PRIMITIVE_TYPES.toString(), currentToken);
    }

    return node;
}

const dataType = () => {
    const node =  {name: '<TIPAGEM>', children:[]};
    getToken();

    if(currentToken.image === ':') {
        node.children.push({name:   currentToken.image, children:[], token: currentToken})
        node.children.push(primitiveType());
    } else {
        errors.push(getSyntaxError(':', currentToken));
    }

    return node;
}

const listId = () => {
    const node =  {name: '<ID>', children:[]};
    getToken();

    if(currentToken.class === classifiers.IDENTIFIER) {
            node.children.push({name: `${classifiers.IDENTIFIER}=>${currentToken.image}`, children: [], token: currentToken});

        if(lookAhead().image === ',') {
            getToken();
            node.children.push(listId());
        }

    } else {
        errors.push(getSyntaxError(classifiers.IDENTIFIER, currentToken));
    }

    return node;
}

const declareVar = () => {
    const node =  {name: '<DECLAR_VARIAVEL>', children:[]};
    getToken()

    if(currentToken.image === 'var') {
        node.children.push({name: currentToken.image, children:[], token: currentToken});
        node.children.push(listId());

        if(lookAhead().image === ':') {
            node.children.push(dataType());
        }

    } else {
        errors.push(getSyntaxError('var', currentToken));
    }

    return node;

}

const operand = () => {
    const node =  {name: '<OPERANDO>', children:[]};

    if(isOperand()) {
       getToken();
        
        if(currentToken.class === classifiers.IDENTIFIER) {
            node.children.push({name: `${classifiers.IDENTIFIER}=>${currentToken.image}`, children:[], token: currentToken});
        } else {
            node.children.push({name: currentToken.image, children:[], token: currentToken});
        }
        
    } else {
        errors.push(getSyntaxError('id | cli | clr | clt', currentToken));
    }

    return node;


}

isOperand = () => lookAhead().class === classifiers.LITERAL_INTEGER || 
lookAhead().class === classifiers.LITERAL_FLOAT || 
lookAhead().class === classifiers.LITERAL_STRING || 
(lookAhead().class === classifiers.IDENTIFIER && lookAhead(2).image !== '(')


const factor = () => {
    const node =  {name: '<FATOR>', children:[]};
    
    if(isOperand()) {
        node.children.push(operand());
    } else if(lookAhead().class === classifiers.IDENTIFIER) {
        node.children.push(callFunc());
    } else if(lookAhead().image === '(') {
        getToken();
        node.children.push({name: '(', children: [], token: currentToken});
        node.children.push(exprAritmet());
        getToken();
        if(currentToken.image === ')') {
            node.children.push({name: ')', children: [], token: currentToken});
        } else {
            errors.push(getSyntaxError(')', currentToken));
        }
    } else {
        errors.push(getSyntaxError('<FATOR>', currentToken));
    }

    return node;

}   

const term = () => {
    const node =  {name: '<TERMO>', children:[]};

    node.children.push(factor());

    if(symbolClassifiers[classifiers.ARITHMETIC_OPERATORS].indexOf(lookAhead().image) > -1 ) {
        node.children.push(aritmOperator());
        node.children.push(term());
    }

    return node;

}


const aritmOperator = () => {
    const node =  {name: '<TERMO>', children:[]};
    getToken();

    if(symbolClassifiers[classifiers.ARITHMETIC_OPERATORS].indexOf(currentToken.image) > -1 ) {
        node.name = currentToken.image;
        node.token = currentToken;
    } else {
        errors.push(getSyntaxError('+|-|/|*', currentToken));
    }

    return node;

    
}

const exprAritmet = () => {
    const node =  {name: '<EXPR_ARITMET>', children:[]};
    node.children.push(term());


    if(isOperand() || lookAhead().class === classifiers.IDENTIFIER || lookAhead().image === '(') {
        node.children.push(aritmOperator());
        getToken();
        node.children.push(exprAritmet()); //Adiciona Expressao Aritmetica
    }

    return node;

}

const callFunc = () => {
    const node =  {name: '<CHAMA_FUNC>', children:[]};
    getToken();

    if(currentToken.class === classifiers.IDENTIFIER) {
        node.children.push({name:`${classifiers.IDENTIFIER}=>${currentToken.image}`, children:[], token: currentToken});
        getToken()

        if(currentToken.image === '(') {
            
            if(isOperand()) {
                node.children.push(argument());
            }

            getToken();
            if(currentToken.image === ')') {
                node.children.push({name: ')', children:[], token: currentToken});
            } else {
                errors.push(getSyntaxError(')', currentToken));
            }

        } else {
            errors.push(getSyntaxError('(', currentToken));
        }

    } else {
        errors.push(getSyntaxError(classifiers.IDENTIFIER, currentToken));
    }

    return node;
}

const argument = () => {
    const node =  {name: '<ARGUMENTO>', children:[]};
    node.children.push(operand());

    if(lookAhead().image === ',') {
        getToken();
        node.children.push(argument());
    }

    return node;

}

const atrib = () => {
    const node =  {name: '<ATRIBUICAO>', children:[]};
    getToken();

    if(currentToken.class === classifiers.IDENTIFIER) {
        node.children.push({name:`${classifiers.IDENTIFIER}=>${currentToken.image}`, children:[], token: currentToken});
        getToken();

        if(currentToken.image === '=') {
            node.children.push({name: '=', children:[], token: currentToken});
            node.children.push(exprAritmet());
        } else {
            errors.push(getSyntaxError('=', currentToken));
        }
    } else {
        errors.push(getSyntaxError(classifiers.IDENTIFIER, currentToken));
    }

    return node;
     
}

const condition = () => {
    const node =  {name: '<CONDICAO>', children:[]};
    node.children.push(exprAritmet());

    getToken();
    if(symbolClassifiers[classifiers.BOOL_OPERATORS].indexOf(currentToken)) {
        node.children.push(exprAritmet());
    } else {
        errors.push(getSyntaxError(symbolClassifiers[classifiers.BOOL_OPERATORS].toString(), currentToken));
    }

}

const elseIfStatement = () => {
    const node =  {name: '<SENAO>', children:[]};
    getToken();

    if(currentToken.image === 'senao') {
        node.children.push({name:currentToken.image, children:[], token: currentToken});
        node.children.push(commandsBlock());
    } else {
        errors.push(getSyntaxError('senao', currentToken));
    }

}

const ifStatement = () => {
    const node =  {name: '<SE>', children:[]};
    getToken();

    if(currentToken.image === 'se') {
        node.children.push({name:currentToken.image, children:[], token: currentToken});
        getToken();

        if(currentToken.image === '(') {
            node.children.push({name:currentToken.image, children:[], token: currentToken});
            node.children.push(condition());

            if(currentToken.image === ')') {
                node.children.push({name:currentToken.image, children:[], token: currentToken});
                node.children.push(commandsBlock());

                if(lookAhead().image === 'senao') {
                    node.children.push(elseIfStatement());
                }

            } else {
                errors.push(getSyntaxError(')', currentToken));
            }            

        } else {
            errors.push(getSyntaxError('(', currentToken));
        }
    } else {
        errors.push(getSyntaxError('se', currentToken));
    }

    return node;

}

const whileStatement = () => {
    const node =  {name: '<ENQUANTO>', children:[]};
    getToken();

    if(currentToken.image === 'enquanto') {
        node.children.push({name:currentToken.image, children:[], token: currentToken});
        getToken();
        if(currentToken.image === '(') {
            node.children.push({name:currentToken.image, children:[], token: currentToken});
            node.children.push(condition());
            if(currentToken.image === ')') {
                node.children.push({name:currentToken.image, children:[], token: currentToken});
                node.children.push(commandsBlock());
            } else {
                errors.push(getSyntaxError(')', currentToken));
            }

        } else {
            errors.push(getSyntaxError('(', currentToken));
        }
    } else {
        errors.push(getSyntaxError('enquanto', currentToken));
    }

    return node;
}

const returnStatement = () => {
    const node =  {name: '<ENQUANTO>', children:[]};
    getToken();

    if(currentToken.image === 'retorne') {
        node.children.push({name:currentToken.image, children:[], token: currentToken});
        node.children.push(factor());
    } else {
        errors.push(getSyntaxError('retorne', currentToken));
    }

    return node;
}

const readStatement = () => {
    const node =  {name: '<ENTRADA>', children:[]};
    getToken();

    if(currentToken.image === 'leia') {
        node.children.push({name:currentToken.image, children:[], token: currentToken});
        getToken();
        if(currentToken.image === '(') {
            node.children.push({name:currentToken.image, children:[], token: currentToken});
            getToken();
            
            if(currentToken.class === classifiers.IDENTIFIER) {
                node.children.push({name: `${classifiers.IDENTIFIER}=>${currentToken.image}`, children:[], token: currentToken});
                getToken();

                if(currentToken.image === ')') {
                    node.children.push({name:currentToken.image, children:[], token: currentToken});
                } else {
                    errors.push(getSyntaxError(')', currentToken));
                }

            } else {
                errors.push(getSyntaxError(classifiers.IDENTIFIER, currentToken));
            }
        } else {
            errors.push(getSyntaxError('(', currentToken));
        }

    } else {
        errors.push(getSyntaxError('leia', currentToken));
    }

    return node;

}

const writeStatement = () => {
    const node =  {name: '<SAIDA>', children:[]};
    getToken();

    if(currentToken.image === 'escreva') {
        node.children.push({name:currentToken.image, children:[], token: currentToken});
        getToken();
        if(currentToken.image === '(') {
            node.children.push({name:currentToken.image, children:[], token: currentToken});
            node.children.push(operand());
            
            getToken();
            if(currentToken.image === ')') {
                node.children.push({name:currentToken.image, children:[], token: currentToken});
            } else {
                errors.push(getSyntaxError(')', currentToken));
            }
            
        } else {
            errors.push(getSyntaxError('(', currentToken));
        }

    } else {
        errors.push(getSyntaxError('leia', currentToken));
    }

    return node;

}

const command = () => {
    const node =  {name: '<COMANDO>', children:[]};

    if(lookAhead().image === 'var') {
        node.children.push(declareVar());
    } else if(lookAhead().class === classifiers.IDENTIFIER && lookAhead(2).image === '=') {
        node.children.push(atrib());
    } else if(lookAhead().image === 'se') {
        node.children.push(ifStatement());
    } else if(lookAhead().image === 'enquanto') {
        node.children.push(whileStatement());
    } else if(lookAhead().image === 'retorne') {
        node.children.push(returnStatement());
    } else if(lookAhead().image === 'leia') {
        node.children.push(readStatement());
    } else if(lookAhead().image === 'escreva') {
        node.children.push(writeStatement());
    } else if(lookAhead().class === classifiers.IDENTIFIER && lookAhead(2).image === '(') {
        node.children.push(callFunc())
    } else {
        errors.push(getSyntaxError('<COMANDO>', currentToken));
    }

    getToken();
    
    if(currentToken.image === ';') {
        node.children.push({name:currentToken.image, children:[], token: currentToken});
    } else {
        errors.push(getSyntaxError(';', currentToken));
    }

    return node;

}

const commands = () => {
    const node =  {name: '<COMANDOS>', children:[]};
    node.children.push(command());

    while(lookAhead() && lookAhead().image !== '}' && lookAhead().image !== 'func') {
        node.children.push(command());
    }

    // if(lookAhead() && lookAhead().image !== '}' && lookAhead().image !== 'func') {
    //     node.children.push(commands());
    // }

    return node;
}

const commandsBlock = () => {
    const node =  {name: '<BLOCO>', children:[]};
    getToken();
    
    if(currentToken.image === '{') {
        node.children.push({name: '{', children:[], token: currentToken});


        if(lookAhead().image !== '}') {
            node.children.push(commands());
        }

        getToken();

        if(currentToken && currentToken.image !== '}') {
            errors.push(getSyntaxError('}', currentToken));
        }


        node.children.push({name: '}', children:[], token: currentToken});


    } else {
        errors.push(getSyntaxError('{', currentToken));
    }

    return node;
}


const mainScope = () => {

    while(lookAhead() && pToken < tokens.length) {
        if(lookAhead().image === 'func') {
            tree.children.push(funcDeclaration());
        } else {
            tree.children.push(commands());
        }
    }

}

const funcDeclaration = () => {
    const node =  {name: '<FUNC>', children:[]};
    getToken();
    if(currentToken.image === 'func') {
        node.children.push({name:'func', children:[], token: currentToken});
        getToken();
        if(currentToken.class === classifiers.IDENTIFIER) {
            node.children.push({name: `${classifiers.IDENTIFIER}=>${currentToken.image}`, children:[], token: currentToken})
            scope = currentToken.image;
            getToken();
            if(currentToken.image === '(') {
                node.children.push({name:currentToken.image, children:[], token: currentToken});

                    let funcP = funcParams();
                    funcP && node.children.push(funcP);
                    getToken();

                    if(currentToken.image === ')') {
                        node.children.push({name:currentToken.image, children:[], token: currentToken});

                        if(lookAhead().image === ':') {
                            node.children.push(dataType());// TIPAGEM

                            if(lookAhead().image === '{') {
                                node.children.push(commandsBlock());
                            } else {
                                errors.push(getSyntaxError('{', currentToken));
                            }

                        } else {
                            errors.push(getSyntaxError(`:`, currentToken));
                        }

                    } else {
                        errors.push(getSyntaxError(`)`, currentToken));
                    }

            } else {
                errors.push(getSyntaxError('(', currentToken));
            }
            
        } else {
            errors.push(getSyntaxError(classifiers.IDENTIFIER, currentToken));
        }
    }

    return node;
}

module.exports = {
    run: (to, tr) => {
        tokens = to;
        tree = tr;

        mainScope();

        

        if(errors.length) {
            console.log('\n\n Error Stack: ', errors);
            console.log('\n');

            throw('Ocorreu um erro durante a compilação');
        }

        return { descendants: tree, symbolTable };
        
    }
}
