"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityManager = void 0;
const MergedDataService_1 = require("../data/MergedDataService");
const RemoteDataService_1 = require("../data/RemoteDataService");
const ModificationContext_1 = require("./ModificationContext");
const QueryResult_1 = require("./QueryResult");
const Record_1 = require("./Record");
const RecordManager_1 = require("./RecordManager");
class EntityManager {
    constructor(stateManager, schema) {
        this.stateManager = stateManager;
        this.schema = schema;
        this._recordManagerMap = new Map();
        this._queryResultMap = new Map();
        this._evictListenerMap = new Map();
        this._changeListenerMap = new Map();
        this._associationValueObservers = new Set();
        this._bidirectionalAssociationManagementSuspending = false;
        this.dataService = new MergedDataService_1.MergedDataService(new RemoteDataService_1.RemoteDataService(this));
        const queryType = schema.typeMap.get("Query");
        if (queryType !== undefined) {
            this._queryRecord = this.saveId("Query", Record_1.QUERY_OBJECT_ID);
        }
        const mutationType = schema.typeMap.get("Mutation");
        if (mutationType !== undefined) {
            this.saveId("Mutation", Record_1.MUATION_OBJECT_ID);
        }
    }
    recordManager(typeName) {
        const type = this.schema.typeMap.get(typeName);
        if (type === undefined) {
            throw new Error(`Illegal type "${typeName}" that is not exists in schema`);
        }
        let recordManager = this._recordManagerMap.get(typeName);
        if (recordManager === undefined) {
            recordManager = new RecordManager_1.RecordManager(this, type);
            this._recordManagerMap.set(typeName, recordManager);
            recordManager.initializeOtherManagers();
        }
        return recordManager;
    }
    findRefById(typeName, id) {
        return this.recordManager(typeName).findRefById(id);
    }
    get modificationContext() {
        const ctx = this._ctx;
        if (ctx === undefined) {
            throw new Error(`No modificaton context`);
        }
        return ctx;
    }
    modify(action) {
        if (this._ctx !== undefined) {
            return action();
        }
        else {
            this._ctx = new ModificationContext_1.ModificationContext(this.linkToQuery.bind(this), this.publishEvictChangeEvent.bind(this), this.publishEntityChangeEvent.bind(this));
            try {
                return action();
            }
            finally {
                try {
                    this._ctx.close();
                }
                finally {
                    this._ctx = undefined;
                }
            }
        }
    }
    save(shape, objOrArray) {
        this.modify(() => {
            const recordManager = this.recordManager(shape.typeName);
            if (Array.isArray(objOrArray)) {
                for (const obj of objOrArray) {
                    recordManager.save(shape, obj);
                }
            }
            else if (objOrArray !== undefined && objOrArray !== null) {
                recordManager.save(shape, objOrArray);
            }
        });
    }
    delete(typeName, idOrArray) {
        if (typeName === 'Query') {
            throw new Error(`The typeof deleted object cannot be the special type 'Query'`);
        }
        this.modify(() => {
            const recordManager = this.recordManager(typeName);
            if (Array.isArray(idOrArray)) {
                for (const id of idOrArray) {
                    if (id !== undefined && id !== null) {
                        recordManager.delete(id);
                    }
                }
            }
            else if (idOrArray !== undefined && idOrArray !== undefined) {
                recordManager.delete(idOrArray);
            }
        });
    }
    saveId(typeName, id) {
        return this.modify(() => {
            return this.recordManager(typeName).saveId(id);
        });
    }
    retain(args) {
        let result = this._queryResultMap.get(args.key);
        if (result === undefined) {
            if (!this.schema.isAcceptable(args.fetcher.fetchableType)) {
                throw new Error("Cannot accept that fetcher because it is not configured in the state manager");
            }
            result = new QueryResult_1.QueryResult(this, args, () => this._queryResultMap.delete(args.key));
            this._queryResultMap.set(args.key, result);
        }
        return result.retain();
    }
    release(args) {
        const result = this._queryResultMap.get(args.key);
        result === null || result === void 0 ? void 0 : result.release(5000);
    }
    addEvictListener(typeName, listener) {
        if (listener !== undefined && listener !== null) {
            let set = this._evictListenerMap.get(typeName);
            if (set === undefined) {
                set = new Set();
                this._evictListenerMap.set(typeName, set);
            }
            if (set.has(listener)) {
                throw new Error(`Cannot add exists listener`);
            }
            set.add(listener);
        }
    }
    removeEvictListener(typeName, listener) {
        var _a;
        (_a = this._evictListenerMap.get(typeName)) === null || _a === void 0 ? void 0 : _a.delete(listener);
    }
    publishEvictChangeEvent(e) {
        for (const observer of this._associationValueObservers) {
            observer.onEntityEvict(this, e);
        }
        for (const [, set] of this._evictListenerMap) {
            for (const listener of set) {
                listener(e);
            }
        }
    }
    addChangeListener(typeName, listener) {
        if (listener !== undefined && listener !== null) {
            let set = this._changeListenerMap.get(typeName);
            if (set === undefined) {
                set = new Set();
                this._changeListenerMap.set(typeName, set);
            }
            if (set.has(listener)) {
                throw new Error(`Cannot add exists listener`);
            }
            set.add(listener);
        }
    }
    removeChangeListener(typeName, listener) {
        var _a;
        (_a = this._changeListenerMap.get(typeName)) === null || _a === void 0 ? void 0 : _a.delete(listener);
    }
    publishEntityChangeEvent(e) {
        for (const observer of this._associationValueObservers) {
            observer.onEntityChange(this, e);
        }
        for (const [, set] of this._changeListenerMap) {
            for (const listener of set) {
                listener(e);
            }
        }
    }
    linkToQuery(type, id) {
        const qr = this._queryRecord;
        if (qr !== undefined) {
            const record = this.saveId(type.name, id);
            for (const [, field] of qr.type.fieldMap) {
                if (field.targetType !== undefined && field.targetType.isAssignableFrom(type)) {
                    qr.link(this, field, record);
                }
            }
        }
    }
    addAssociationValueObserver(observer) {
        if (observer !== undefined && observer !== null) {
            this._associationValueObservers.add(observer);
        }
    }
    removeAssociationValueObserver(observer) {
        this._associationValueObservers.delete(observer);
    }
    forEach(typeName, visitor) {
        this.recordManager(typeName).forEach(visitor);
    }
    get isBidirectionalAssociationManagementSuspending() {
        return this._bidirectionalAssociationManagementSuspending;
    }
    suspendBidirectionalAssociationManagement(action) {
        if (this._bidirectionalAssociationManagementSuspending) {
            return action();
        }
        this._bidirectionalAssociationManagementSuspending = true;
        try {
            return action();
        }
        finally {
            this._bidirectionalAssociationManagementSuspending = false;
        }
    }
}
exports.EntityManager = EntityManager;
