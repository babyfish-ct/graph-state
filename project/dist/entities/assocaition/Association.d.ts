import { FieldMetadata } from "../../meta/impl/FieldMetadata";
import { EntityManager, Garbage } from "../EntityManager";
import { Record } from "../Record";
import { VariableArgs } from "../../state/impl/Args";
import { RecordConnection } from "./AssociationConnectionValue";
import { Pagination } from "../QueryArgs";
import { TextWriter } from "graphql-ts-client-api";
import { EntityChangeEvent, EntityEvictEvent } from "../EntityEvent";
export declare class Association {
    readonly record: Record;
    readonly field: FieldMetadata;
    private valueMap;
    private linkChanging;
    private refreshedVersion;
    constructor(record: Record, field: FieldMetadata);
    has(args: VariableArgs | undefined): boolean;
    get(args: VariableArgs | undefined): Record | ReadonlyArray<Record | undefined> | RecordConnection | undefined;
    contains(args: VariableArgs | undefined, target: Record, tryMoreStrictArgs: boolean): boolean;
    anyValueContains(target: Record): boolean | undefined;
    set(entityManager: EntityManager, args: VariableArgs | undefined, value: any, pagination?: Pagination): void;
    evict(entityManager: EntityManager, args: VariableArgs | undefined, includeMoreStrictArgs: boolean): void;
    link(entityManager: EntityManager, target: Record | ReadonlyArray<Record>, mostStringentArgs: VariableArgs | undefined, insideModification?: boolean): void;
    unlink(entityManager: EntityManager, target: Record | ReadonlyArray<Record>, leastStringentArgs: VariableArgs | undefined, insideModification?: boolean): void;
    unlinkAll(entityManager: EntityManager, target: Record): void;
    appendTo(map: Map<string, any>): void;
    private value;
    private changeLinks;
    refresh(entityManager: EntityManager, event: EntityEvictEvent | EntityChangeEvent): void;
    writeTo(writer: TextWriter): void;
    gcVisit(args: VariableArgs | undefined): void;
    collectGarbages(output: Garbage[]): void;
}
