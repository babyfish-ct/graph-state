import { ScalarRow } from "../..";
import { PositionType } from "../../meta/Configuration";
import { EntityManager } from "../EntityManager";
import { objectWithOnlyId, Record } from "../Record";
import { AssociationValue } from "./AssocaitionValue";
import { toRecordMap } from "./util";

export class AssociationConnectionValue extends AssociationValue {

    private connection?: RecordConnection;

    private indexMap?: Map<any, number>;

    getAsObject(): ObjectConnection {
        if (this.connection === undefined) {
            return { edges: [] };
        }
        return {
            ...this.connection,
            edges: this.connection.edges.map(edge => {
                return {
                    ...edge,
                    node: objectWithOnlyId(edge.node)
                };
            })
        };
    }

    get(): RecordConnection {
        return this.connection ?? { edges: [] };
    }

    set(
        entityManager: EntityManager, 
        value: ObjectConnection
    ) {
        const association = this.association;

        this.validate(value);
        if (this.valueEquals(value)) {
            return;
        }
        const oldValueForTriggger = this.getAsObject();
        
        const oldIndexMap = this.indexMap;

        const newIndexMap = new Map<any, number>();
        const newEdges: Array<RecordEdge> = [];
        for (let i = 0; i < value.edges.length; i++) {
            const edge = value.edges[i];
            const newNode = entityManager.saveId(association.field.targetType!.name, edge.node.id);
            if (!newIndexMap.has(newNode.id)) {
                newEdges.push({node: newNode, cursor: edge.cursor});
                newIndexMap.set(newNode.id, i);
            }
        }

        if (this.connection !== undefined) {
            for (const oldEdge of this.connection.edges) {
                if (!newIndexMap.has(oldEdge.node.id)) {
                    this.releaseOldReference(entityManager, oldEdge.node);
                }
            }
        }
        
        this.connection = {
            ...value,
            edges: newEdges
        };
        this.indexMap = newIndexMap.size !== 0 ? newIndexMap : undefined;
        
        for (const newEdge of newEdges) {
            if (oldIndexMap?.has(newEdge.node.id) !== true) {
                this.retainNewReference(entityManager, newEdge.node);
            }
        }

        entityManager.modificationContext.set(
            this.association.record, 
            association.field.name, 
            this.args, 
            oldValueForTriggger, 
            this.getAsObject()
        );
    }

    link(
        entityManager: EntityManager, 
        targets: ReadonlyArray<Record>
    ): void {
        if (this.connection === undefined) {
            throw new Error("Internal bug: connection cannot be undefined");
        }
        const edges = [...this.connection.edges];
        const indexMap = this.indexMap;
        const linkMap = toRecordMap(targets);
        const position = this.association.field.associationProperties!.position;
        for (const record of linkMap.values()) {
            if (indexMap?.has(record.id) !== true) {
                try {
                    appendTo(edges, record, position);
                } catch (ex) {
                    if (!ex[" $evict"]) {
                        throw ex;
                    }
                    this.evict(entityManager);
                    return;
                }
            }
        }
        if (edges.length !== this.connection.edges.length) {
            this.association.set(
                entityManager,
                this.args,
                {
                    ...this.connection,
                    edges
                }
            );
        }
    }

    unlink(
        entityManager: EntityManager, 
        targets: ReadonlyArray<Record>
    ) {
        if (this.connection === undefined) {
            throw new Error("Internal bug: connection cannot be undefined");
        }
        const edges = [...this.connection.edges];
        const indexMap = this.indexMap;
        const unlinkMap = toRecordMap(targets);
        for (const record of unlinkMap.values()) {
            const index = indexMap?.get(record.id);
            if (index !== undefined) {
                edges.splice(index, 1);
            }
        }
        if (edges.length !== this.connection.edges.length) {
            this.association.set(
                entityManager,
                this.args,
                {
                    ...this.connection,
                    edges
                }
            );
        }
    }

    contains(target: Record): boolean {
        return this.indexMap?.has(target.id) === true;
    }

    private validate(value: ObjectConnection) {
        const association = this.association;
        if (value === undefined) {
            throw Error(`Cannot set the undefined or null value to "${association.field.fullName}" because it's connection field`);
        }
        if (value.pageInfo !== undefined) {
            if (typeof value.pageInfo !== 'object') {
                throw Error(`The connection object of "${association.field.fullName}" must have an object field named "pageInfo"`);
            }
            if (typeof value.pageInfo.startCursor !== 'string') {
                throw Error(`The pageInfo object of "${association.field.fullName}.pageInfo" must have string field named "startCursor"`);
            }
            if (typeof value.pageInfo.endCursor !== 'string') {
                throw Error(`The pageInfo object of "${association.field.fullName}.pageInfo" must have string field named "endCursor"`);
            }
        }
        if (!Array.isArray(value.edges)) {
            throw Error(`The connection object of "${association.field.fullName}" must have an array field named "edges"`);
        }
        const idFieldName = association.field.targetType!.idField.name;
        for (const edge of value.edges) {
            if (edge === undefined || edge === null) {
                throw Error(`The array "${association.field.fullName}.edges" cannot contain undefined or null`);
            }
            if (value.cursor !== undefined && typeof edge.cursor !== "string") {
                throw Error(`The edge object in th array "${association.field.fullName}.edges" must support string field "cursor"`);
            }
            if (typeof edge.node !== "object") {
                throw Error(`The edge object in th array "${association.field.fullName}.edges" must support object field "node"`);
            }
            if (edge.node[idFieldName] === undefined || edge.node[idFieldName] === null) {
                throw Error(`The edge node object in th array "${association.field.fullName}.edges[].node" must support id field "${idFieldName}"`);
            }
        }
    }

    private valueEquals(
        newConnection: ObjectConnection
    ): boolean {
        const oldConnection = this.connection;
        if (oldConnection === undefined) {
            return false;
        }
        if (oldConnection.edges.length !== newConnection.edges.length) {
            return false;
        }
        const oldFields = new Set<string>();
        for (const name in oldConnection) {
            if (name !== "pageInfo" && name !== "edges") {
                oldFields.add(name);
                if (oldConnection[name] !== newConnection[name]) {
                    return false;
                }
            }
        }
        for (const name in newConnection) {
            if (name !== "pageInfo" && name !== "edges" && !oldFields.has(name)) {
                if (oldConnection[name] !== newConnection[name]) {
                    return false;
                }
            }
        }
        if (oldConnection.pageInfo?.hasNextPage !== newConnection.pageInfo?.hasNextPage ||
            oldConnection.pageInfo?.hasPreviousPage !== newConnection.pageInfo?.hasPreviousPage ||
            oldConnection.pageInfo?.startCursor !== newConnection.pageInfo?.startCursor ||
            oldConnection.pageInfo?.endCursor !== newConnection.pageInfo?.endCursor
        ) {
            return false;
        }
        const idFieldName = this.association.field.targetType!.idField.name;
        for (let i = oldConnection.edges.length - 1; i >= 0; --i) {
            const oldEdge = oldConnection.edges[i];
            const newEdge = newConnection.edges[i];
            if (oldEdge.cursor !== newEdge.cursor) {
                return false;
            }
            if (oldEdge.node.id !== newEdge.node[idFieldName]) {
                return false;
            }
        }
        return true;
    }
}

export interface RecordConnection {
    readonly edges: ReadonlyArray<RecordEdge>;
    readonly pageInfo?: PageInfo;
    readonly [key: string]: any;
}

export interface RecordEdge {
    readonly node: Record;
    readonly cursor?: string;
}

export interface ObjectConnection {
    readonly edges: ReadonlyArray<ObjectEdge>;
    readonly pageInfo?: PageInfo;
    readonly [key: string]: any;
}

export interface ObjectEdge {
    readonly node: any;
    readonly cursor?: string;
}

export interface PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
}

function toNodeMap(edges: ReadonlyArray<RecordEdge>) {
    const map = new Map<any, Record>();
    for (const edge of edges) {
        map.set(edge.node.id, edge.node);
    }
    return map;
}

function appendTo(
    newEdges: Array<RecordEdge>, 
    newNode: Record,
    position: (
        row: ScalarRow<any>,
        rows: ReadonlyArray<ScalarRow<any>>,
        variables?: any
    ) => PositionType | undefined
) {
    const pos = newEdges.length === 0 ? 
        0 : 
        position(newNode.toRow(), newEdges.map(e => e.node.toRow()), this.args?.variables);
    if (pos === undefined) {
        throw { " $evict": true };
    }
    const index = pos === "start" ? 0 : pos === "end" ? newEdges.length : pos;
    const cursor = "";
    if (index >= newEdges.length) {
        newEdges.push({node: newNode, cursor });
    } else {
        newEdges.splice(Math.max(0, index), 0, { node: newNode, cursor });
    }
}
