import { store_boardmix_header, openLoginFun } from '@/libs/store'
import { pushErrMsg } from "@/libs/api";
let boardmix_header = {}
store_boardmix_header.subscribe((value) => boardmix_header = value)

export async function request(url, data) {
    setTimeout(() => { }, 200);
    return await fetch(url, data);
}

let openLogin;
openLoginFun.subscribe(fun => openLogin = fun)

export async function trash(param) {
    let resp;
    let { nodeId, project_id, team_id, folder_id, type } = param;
    if (type === "file") {
        resp = await request(
            `https://api.boardmix.cn/api/web/file/${nodeId}/trash`,
            {
                headers: boardmix_header,
                method: "POST",
            },
        );
    } else if (type === "folder") {
        folder_id = nodeId;
        resp = await request(
            `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/folder/${folder_id}/trash`,
            {
                headers: boardmix_header,
                method: "POST",
            },
        );
    } else if (type === "project") {
        project_id = nodeId;
        resp = await request(
            `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/trash`,
            {
                headers: boardmix_header,
                method: "POST",
            },
        );
    }

    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res;
}


async function checkValid(resp) {
    if (resp.code == 401) {
        await pushErrMsg(resp.msg + "\n" + "请打开登录界面，点击`已经登录`按钮 ");
        await openLogin();
    }
}


/**
* 创建文件夹
* @param param
*/
export async function createFolder(param, name) {
    let resp, url;
    let { nodeId, project_id, team_id, folder_id, type } = param;
    if (type === "folder") {
        folder_id = nodeId;
    } else if (type === "project") {
        project_id = nodeId;
        folder_id = 0;
    }
    url = `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/folder`;
    resp = await request(
        url,
        {
            headers: boardmix_header,
            method: "POST",
            body: JSON.stringify({ name: name, pid: folder_id })
        },
    );
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0 ? res.data : null;
}



/**
    * 创建文件
    * @param param
    */
export async function createFile(param, name) {
    let resp, url;
    let { nodeId, project_id, team_id, folder_id, type } = param;
    if (type === "folder") {
        folder_id = nodeId;
    } else if (type === "project") {
        project_id = nodeId;
        folder_id = 0;
    }
    url = `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/file`;
    resp = await request(
        url,
        {
            headers: boardmix_header,
            method: "POST",
            body: JSON.stringify({ name: name, folder_id: folder_id })
        },
    );
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0 ? res.data : null;
}


/**
* 重命名
* @param param
*/
export async function rename(param, name) {
    let resp, url;
    let { nodeId, project_id, team_id, folder_id, type } = param;
    if (type === "folder") {
        folder_id = nodeId;
        url = `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/folder/${folder_id}/rename`
    } else if (type === "project") {
        project_id = nodeId;
        folder_id = 0;
        url = `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/name`
    } else if (type === "file") {
        url = `https://api.boardmix.cn/api/web/file/${nodeId}/name`;
    } else if (type === "team") {
        url = `https://api.boardmix.cn/api/web/team/${nodeId}/name`;
    }

    resp = await request(
        url,
        {
            headers: boardmix_header,
            method: "POST",
            body: JSON.stringify({ name: name })
        },
    );
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res;
}

/**
 * 获取文件夹
 * @param team_id
 * @param project_id
 * @param folder_id
 */
export async function getFolder(team_id, project_id, folder_id) {
    let resp = await request(
        `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/folder/${folder_id}/list`,
        {
            headers: boardmix_header,
        },
    );
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0 ? res.data : null;
}

export async function getTeams() {
    let resp = await request("https://api.boardmix.cn/api/web/teams", {
        headers: boardmix_header,
    });
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0 ? res.data : null;
}


export async function getProjects(team_id) {
    let resp = await request(
        `https://api.boardmix.cn/api/web/team/${team_id}/projects`,
        {
            headers: boardmix_header,
        },
    );
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0 ? res.data : null;
}


export let getSpaceConfig = async () => {
    let resp = await request("https://api.boardmix.cn/api/web/space", {
        headers: boardmix_header,
    });
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0 ? res.data : null;
};

export async function getFiles(team_id, project_id, folder_id) {
    let resp = await request(
        `https://api.boardmix.cn/api/web/team/${team_id}/project/${project_id}/files?folder_id=${folder_id}`,
        {
            headers: boardmix_header,
        },
    );
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0 ? res.data : null;
};




export async function move(targetNode, moveNode) {
    let fileKey = targetNode.nodeId;
    let moveType = moveNode.type;
    let srcType = targetNode.type;


    let team_id = moveNode.team_id;
    let folder_id, project_id, url, body;
    if (moveType === "project") {
        project_id = moveNode.nodeId;
        folder_id = 0;
    } else if (moveType === "folder") {
        folder_id = moveNode.nodeId;
        project_id = moveNode.project_id;
    }

    if (srcType === "file") {
        url = `https://api.boardmix.cn/api/web/file/${fileKey}/move`;
        body = JSON.stringify({ folder_id: folder_id, project_id: project_id, team_id: team_id })
    } else if (srcType === "folder") {
        url = `https://api.boardmix.cn/api/web/team/${targetNode.team_id}/project/${targetNode.project_id}/folder/${targetNode.folder_id}/move
        `
        body = JSON.stringify({
            to_next_folder_id: 0,
            to_pid: folder_id,
            to_pre_folder_id: 0,
            to_project_id: project_id
        })
    }


    let resp = await request(
        url,
        {
            headers: boardmix_header,
            method: "POST",
            body: body
        },
    );
    let res = await resp.json();
    if (res.code !== 0) {
        console.error(res.msg, res);
    }
    await checkValid(res);
    return res.code === 0;
};
