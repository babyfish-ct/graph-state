import { EntityChangeEvent, EntityEvictEvent } from "../EntityEvent";
import { EntityManager } from "../EntityManager";
import { Record } from "../Record";
import { VariableArgs } from "../../state/impl/Args";
import { Association } from "./Association";
import { ObjectConnection, RecordConnection } from "./AssociationConnectionValue";
import { Pagination } from "../QueryArgs";
export declare abstract class AssociationValue {
    readonly association: Association;
    readonly args?: VariableArgs | undefined;
    private dependencies?;
    gcVisited: boolean;
    constructor(association: Association, args?: VariableArgs | undefined);
    abstract getAsObject(): any | ReadonlyArray<any> | ObjectConnection | undefined;
    abstract get(): Record | ReadonlyArray<Record> | RecordConnection | undefined;
    abstract set(entityManager: EntityManager, value: any, pagination?: Pagination): void;
    abstract link(entityManager: EntityManager, targets: ReadonlyArray<Record>): void;
    abstract unlink(entityManager: EntityManager, targets: ReadonlyArray<Record>): void;
    abstract contains(target: Record): boolean;
    protected abstract reorder(entityManager: EntityManager, target: Record): void;
    protected releaseOldReference(entityManager: EntityManager, oldReference: Record | undefined): void;
    protected retainNewReference(entityManager: EntityManager, newReference: Record | undefined): void;
    referesh(entityManager: EntityManager, e: EntityEvictEvent | EntityChangeEvent): void;
    private refreshByEvictEvent;
    private refreshByChangeEvent;
    private isTargetChanged;
    protected evict(entityManager: EntityManager): void;
    get isLinkOptimizable(): boolean;
}
