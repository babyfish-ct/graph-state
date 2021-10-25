"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryService = void 0;
;
const Record_1 = require("./Record");
class QueryService {
    constructor(entityManager) {
        this.entityManager = entityManager;
    }
    query(args, useCache, useDataService) {
        if (args.ids === undefined) {
            return this.graph(args, useCache, useDataService);
        }
        return this.objects(args, useCache, useDataService);
    }
    graph(args, useCache, useDataService) {
        if (useCache) {
            try {
                return {
                    type: "cached",
                    data: this.findObject(Record_1.QUERY_OBJECT_ID, args.shape)
                };
            }
            catch (ex) {
                if (!ex[" $canNotFoundFromCache"]) {
                    throw ex;
                }
                const reason = ex["reason"];
                if (useDataService) {
                    console.debug(reason);
                }
                else {
                    throw new Error(reason);
                }
            }
        }
        if (useDataService) {
            return {
                type: "deferred",
                promise: this.entityManager.dataService.query(args)
            };
        }
        throw new Error('Internal bug: neither "useCache" nor "useDataService" is set');
    }
    objects(args, useCache, useDataService) {
        const ids = args.ids;
        if (ids.length === 0) {
            return {
                type: "cached",
                data: []
            };
        }
        let map = new Map();
        if (useCache) {
            map = this.findObjects(ids, args.shape);
        }
        else {
            map = new Map();
        }
        const missedIds = [];
        for (const id of ids) {
            if (!map.has(id)) {
                missedIds.push(id);
            }
        }
        if (missedIds.length === 0) {
            return {
                type: "cached",
                data: Array.from(map.values())
            };
        }
        if (useDataService) {
            return {
                type: "deferred",
                promise: this.loadAndMerge(map, args, missedIds)
            };
        }
        throw new Error('Internal bug: neither "useCache" nor "useDataService" is set');
    }
    findObjects(ids, shape) {
        const map = new Map();
        for (const id of ids) {
            try {
                map.set(id, this.findObject(id, shape));
            }
            catch (ex) {
                if (!ex[" $canNotFoundFromCache"]) {
                    throw ex;
                }
            }
        }
        return map;
    }
    findObject(id, shape) {
        const ref = this.entityManager.findRefById(shape.typeName, id);
        if (ref === undefined) {
            canNotFoundFromCache(`Cannot find the '${shape.typeName}' object whose id is '${id}'`);
        }
        if (ref.value === undefined) {
            return undefined;
        }
        return mapRecord(this.entityManager.schema.typeMap.get(shape.typeName), ref.value, shape);
    }
    loadAndMerge(objMap, args, missedIds) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const shape = args.shape;
            const idFieldName = this.entityManager.schema.typeMap.get(shape.typeName).idField.name;
            const idFieldAlias = (_b = (_a = shape.fieldMap.get(idFieldName)) === null || _a === void 0 ? void 0 : _a.alias) !== null && _b !== void 0 ? _b : idFieldName;
            const missedObjects = yield this.entityManager.dataService.query(args.newArgs(missedIds));
            for (const missedObject of missedObjects) {
                objMap.set(missedObject[idFieldAlias], missedObject);
            }
            return args.ids.map(id => objMap.get(id));
        });
    }
}
exports.QueryService = QueryService;
function mapRecord(type, record, runtimeSchape) {
    var _a, _b, _c, _d;
    if (record === undefined) {
        return undefined;
    }
    const idFieldName = type.idField.name;
    const entity = { [idFieldName]: record.id };
    for (const [, field] of runtimeSchape.fieldMap) {
        if (field.childShape !== undefined) {
            const fieldMetadata = type.fieldMap.get(field.name);
            if (fieldMetadata === undefined) {
                throw new Error(`Cannot find the method for field "${type.name}.${field.name}"`);
            }
            const association = record.getAssociation(fieldMetadata, field.args);
            if (association === undefined && !record.hasAssociation(fieldMetadata, field.args)) {
                canNotFoundFromCache(`Cannot find the associaton field '${fieldMetadata.fullName}${(_b = `:${(_a = field.args) === null || _a === void 0 ? void 0 : _a.key}`) !== null && _b !== void 0 ? _b : ""}' for object whose id is '${record.id}'`);
            }
            entity[(_c = field.alias) !== null && _c !== void 0 ? _c : field.name] = mapAssociation(fieldMetadata, association, fieldMetadata.category === "CONNECTION" ? field.nodeShape : field.childShape);
        }
        else if (field.name !== idFieldName) {
            const scalar = record.getSalar(field.name);
            if (scalar === undefined && !record.hasScalar(field.name)) {
                canNotFoundFromCache(`Cannot find the scalar field '${field.name}' for object whose id is '${record.id}'`);
            }
            entity[(_d = field.alias) !== null && _d !== void 0 ? _d : field.name] = scalar;
        }
    }
    return entity;
}
function mapAssociation(field, association, shape) {
    if (association === undefined) {
        return undefined;
    }
    const targetType = field.targetType;
    if (field.category === "CONNECTION") {
        const connection = association;
        return Object.assign(Object.assign({}, connection), { edges: connection.edges.map(edge => {
                return Object.assign(Object.assign({}, edge), { node: mapRecord(targetType, edge.node, shape) });
            }) });
    }
    if (field.category === "LIST") {
        const list = association;
        return list.map(element => {
            if (element === undefined) {
                return undefined;
            }
            return mapRecord(targetType, element, shape);
        });
    }
    return mapRecord(targetType, association, shape);
}
function canNotFoundFromCache(reason) {
    throw { " $canNotFoundFromCache": true, reason };
}
