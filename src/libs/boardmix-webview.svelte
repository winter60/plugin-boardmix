<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { pushErrMsg } from "@/libs/api";

    export let plugin;
    export let src;
    export let showCookieButton = false;
    

    onMount(async () => {
    });

    onDestroy(() => {});

    let getCookie = () => {
        // session.defaultSession.cookies.get({url:'https://boardmix.cn'}).then(function(cookies,error){
        //     alert(cookies);
        // });
        const ses = window
            .require("@electron/remote")
            .session.fromPartition("persist:boardmix");

        ses.cookies
            .get({ url: "https://boardmix.cn" })
            .then(async function (cookies) {
                let BOSYUNCurrent_Arr = cookies.filter((item) => {
                    return item.name == "BOSYUNCurrent";
                });

                let exist_access_token = BOSYUNCurrent_Arr.length > 0;
                if (!exist_access_token) {
                    pushErrMsg("未获取到 access_token");
                    return;
                }

                let BOSYUNCurrent = JSON.parse(
                    decodeURIComponent(BOSYUNCurrent_Arr[0].value),
                );
                let access_token = BOSYUNCurrent["access_token"];
                if (!access_token) {
                    pushErrMsg("未获取到 access_token");
                } else {
                    console.log("获取到了access_token: " + access_token);
                    await plugin.saveData("BOARDMIX_CONFIG", {
                        access_token: access_token,
                    });
                    let refreshTree =
                        plugin.myTree.$$.ctx[
                            plugin.myTree.$$.props["refreshTree"]
                        ];
                    await refreshTree();

                    //关闭tab
                    plugin.loginTab.then((tab)=>{
                        tab.close();
                    });
                }
            });

        // ses.defaultSession.cookies
        //     .get({ url: "https://boardmix.cn" })
        //     .then(function (cookies) {
        //         console.log(cookies);
        //     });

        // console.table(ses);
    };
</script>

{#if true == showCookieButton}
<button class="cookie_button b3-button"  on:click={getCookie}
>我确认我已经登录了</button
>
{/if}

<webview
    allowfullscreen
    allowpopups
    style="border: none;width:100%;height:100%;"
    class="fn__flex-column fn__flex fn__flex-1"
    src={src}
    partition="persist:boardmix"
></webview>

<style>
    .cookie_button {
        position: absolute;
    }
</style>
