import React, {useEffect, useState} from "react";
import {Badge, Card, Table, TableProps, Typography} from "antd";

interface AsyncJobProps {
    tableId: string;
}

const AsyncJob: React.FC<AsyncJobProps> = ({tableId}) => {
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
    }, [tableId]);


    return (
        <Card size="small" loading={loading}>

        </Card>
    );
};

export default AsyncJob;
