import { LineOutlined, TagFilled, TagsOutlined } from "@ant-design/icons";
import { Button, Card, Tree } from "antd";
import { FC, memo, useCallback } from "react";
import { GraphObject, GraphTypeMetadata } from "../common/Model";
import { createParameterNode } from "../common/value";

export const GraphFieldTree: FC<{
    readonly typeMetadata: GraphTypeMetadata,
    readonly obj: GraphObject,
    readonly value?: string,
    readonly onChange?: (value?: string) => void
}> = memo(({typeMetadata, obj, value, onChange}) => {

    const onTreeSelect = useCallback((keys: any[]) => {
        if (onChange) {
            onChange(keys.length === 0 ? undefined : keys[0])
        }
    }, [onChange]);

    return (
        <Card title="Selected object">
            <Tree 
            selectedKeys={value === undefined ? [] : [value]}
            onSelect={onTreeSelect}>
                {
                    <Tree.TreeNode key="__typename" title={
                        <div>
                            <LineOutlined/>
                            type: {typeMetadata.name}
                        </div>
                    }/>
                }
                { 
                    typeMetadata.superTypeName &&
                    <Tree.TreeNode key="super" title={
                        <div>
                            <LineOutlined/>
                            super: 
                            <Button type="link">{typeMetadata.superTypeName}</Button>
                        </div>
                    }/>
                }
                {
                    typeMetadata.name !== "Query" && <Tree.TreeNode key="id" title={
                        <div>
                            <TagFilled/>id
                        </div>
                    }/>
                }
                {
                    obj.fields.map(field => {
                        if (typeMetadata.declaredFieldMap[field.name]?.isParamerized === true) {
                            return (
                                <Tree.TreeNode key={field.name} title={
                                    <div>
                                       <TagsOutlined/>{field.name} 
                                    </div>
                                }>
                                    {field.parameterizedValues?.map(pv =>
                                        <Tree.TreeNode key={`${field.name}:${pv.parameter}`} title={
                                            <div>
                                                <TagFilled/>
                                                {createParameterNode(pv.parameter)}
                                            </div>
                                        }/>
                                    )}
                                </Tree.TreeNode>
                            );
                        }
                        return (
                            <Tree.TreeNode key={`${field.name}:`} title={
                                <div>
                                    <TagFilled/>{field.name}
                                </div>
                            }/>
                        );
                    })
                }
            </Tree>
        </Card>
    );
});