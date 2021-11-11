import { EntityChangeEvent } from "..";
import { AbstractDataService } from "../data/AbstractDataService";
import { FieldMetadata } from "../meta/impl/FieldMetadata";
import { SchemaMetadata } from "../meta/impl/SchemaMetadata";
import { TypeMetadata } from "../meta/impl/TypeMetdata";
import { VariableArgs } from "../state/impl/Args";
import { StateManagerImpl } from "../state/impl/StateManagerImpl";
import { ReleasePolicy } from "../state/Types";
import { EntityEvictEvent } from "./EntityEvent";
import { ModificationContext } from "./ModificationContext";
import { Pagination, QueryArgs } from "./QueryArgs";
import { QueryResult } from "./QueryResult";
import { Record } from "./Record";
import { RecordManager } from "./RecordManager";
import { RecordRef } from "./RecordRef";
import { RuntimeShape } from "./RuntimeShape";
export declare class EntityManager {
    readonly stateManager: StateManagerImpl<any>;
    readonly schema: SchemaMetadata;
    readonly dataService: AbstractDataService;
    private _recordManagerMap;
    private _queryResultMap;
    private _evictListenerMap;
    private _changeListenerMap;
    private _ctx?;
    private _bidirectionalAssociationManagementSuspending;
    private _gcTimerId?;
    private _modificationVersion;
    constructor(stateManager: StateManagerImpl<any>, schema: SchemaMetadata);
    recordManager(typeName: string): RecordManager;
    findRefById(typeName: string, id: any): RecordRef | undefined;
    get modificationContext(): ModificationContext;
    get modificationVersion(): number;
    modify<T>(action: () => T, forGC?: boolean): T;
    save(shape: RuntimeShape, objOrArray: object | readonly object[], pagination?: Pagination): void;
    delete(typeName: string, idOrArray: any): void;
    evict(typeName: string, idOrArray: any): void;
    saveId(typeName: string, id: any): Record;
    retain(args: QueryArgs): QueryResult;
    release(args: QueryArgs, releasePolicy?: ReleasePolicy<any>): void;
    addEvictListener(typeName: string | undefined, listener: (e: EntityEvictEvent) => void): void;
    removeEvictListener(typeName: string | undefined, listener: (e: EntityEvictEvent) => void): void;
    private publishEvictChangeEvent;
    addChangeListener(typeName: string | undefined, listener: (e: EntityChangeEvent) => void): void;
    removeChangeListener(typeName: string | undefined, listener: (e: EntityChangeEvent) => void): void;
    private publishEntityChangeEvent;
    private refreshByEvictEvent;
    private refreshByChangeEvent;
    forEach(typeName: string, visitor: (record: Record) => boolean | void): void;
    get isBidirectionalAssociationManagementSuspending(): boolean;
    suspendBidirectionalAssociationManagement<T>(action: () => T): T;
    gc(): void;
    private onGC;
    visit(shape: RuntimeShape, objOrArray: object | readonly object[], visitor: EntityFieldVisitor): void;
    private visitObj;
}
export declare type EntityFieldVisitor = (id: any, runtimeType: TypeMetadata, field: FieldMetadata, args: VariableArgs | undefined, value: any) => void | boolean;
export declare type Garbage = Record | FieldGarbage;
interface FieldGarbage {
    readonly record: Record;
    readonly field: FieldMetadata;
    readonly args: VariableArgs | undefined;
}
export {};
