"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryResultHolder = exports.StateValueHolder = void 0;
const QueryArgs_1 = require("../../entities/QueryArgs");
const Variables_1 = require("./Variables");
class StateValueHolder {
    constructor(stateManager, localUpdater) {
        this.stateManager = stateManager;
        this.localUpdater = localUpdater;
    }
    get() {
        const value = this.stateValue;
        if (value === undefined) {
            throw new Error("Illegal StateValueHolder that has not been set or has been released");
        }
        return value;
    }
    set(state, options) {
        var _a, _b, _c, _d;
        const newOptionsJsonText = standardizedJsonText(options);
        if (((_b = (_a = this.stateValue) === null || _a === void 0 ? void 0 : _a.stateInstance) === null || _b === void 0 ? void 0 : _b.state) === state &&
            this.previousOptionsJsonText === newOptionsJsonText) {
            return;
        }
        this.release();
        const vs = Variables_1.standardizedVariables((_c = options) === null || _c === void 0 ? void 0 : _c.variables);
        const vsCode = vs !== undefined ? JSON.stringify(vs) : undefined;
        this.previousOptionsJsonText = newOptionsJsonText;
        this.stateValue = this
            .stateManager
            .scope
            .instance(state, (_d = options === null || options === void 0 ? void 0 : options.propagation) !== null && _d !== void 0 ? _d : "REQUIRED")
            .retain(vsCode, vs);
        this.stateValueChangeListener = (e) => {
            if (e.stateValue === this.stateValue) {
                this.localUpdater(old => old + 1); // Change a local state to update react component
            }
        };
        this.stateManager.addStateValueChangeListener(this.stateValueChangeListener);
    }
    release() {
        try {
            const listener = this.stateValueChangeListener;
            if (listener !== undefined) {
                this.stateValueChangeListener = undefined;
                this.stateManager.removeStateValueChangeListener(listener);
            }
        }
        finally {
            const value = this.stateValue;
            if (value !== undefined) {
                this.stateValue = undefined;
                this.previousOptionsJsonText = undefined;
                value.stateInstance.release(value.variablesCode);
            }
        }
    }
}
exports.StateValueHolder = StateValueHolder;
class QueryResultHolder {
    constructor(stateManager, localUpdater) {
        this.stateManager = stateManager;
        this.localUpdater = localUpdater;
    }
    get() {
        const result = this.queryResult;
        if (result === undefined) {
            throw new Error("Illegal QueryResultHolder that has not been set or has been released");
        }
        return result;
    }
    set(fetcher, ids, variables) {
        var _a;
        const oldQueryArgs = (_a = this.queryResult) === null || _a === void 0 ? void 0 : _a.queryArgs;
        const newQueryArgs = QueryArgs_1.QueryArgs.create(fetcher, ids, variables);
        if ((oldQueryArgs === null || oldQueryArgs === void 0 ? void 0 : oldQueryArgs.key) === newQueryArgs.key) {
            return;
        }
        if (!this.stateManager.entityManager.schema.isAcceptable(fetcher.fetchableType)) {
            throw new Error("Cannot accept that fetcher because it is not configured in the state manager");
        }
        this.release();
        this.queryResult = this.stateManager.entityManager.retain(newQueryArgs);
        this.queryResultChangeListener = (e) => {
            if (e.queryResult === this.queryResult) {
                this.localUpdater(old => old + 1); // Change a local state to update react component
            }
        };
        this.stateManager.addQueryResultChangeListener(this.queryResultChangeListener);
    }
    release() {
        try {
            const listener = this.queryResultChangeListener;
            if (listener !== undefined) {
                this.queryResultChangeListener = undefined;
                this.stateManager.removeQueryResultChangeListener(listener);
            }
        }
        finally {
            const result = this.queryResult;
            if (result !== undefined) {
                this.queryResult = undefined;
                this.stateManager.entityManager.release(result.queryArgs);
            }
        }
    }
}
exports.QueryResultHolder = QueryResultHolder;
function standardizedJsonText(obj) {
    if (obj === undefined || obj === null) {
        return undefined;
    }
    if (typeof obj === "object" && !Array.isArray(obj)) {
        const vs = Variables_1.standardizedVariables(obj);
        return vs !== undefined ? JSON.stringify(vs) : undefined;
    }
    return JSON.stringify(obj);
}
