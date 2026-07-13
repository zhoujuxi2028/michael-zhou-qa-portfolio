*** Settings ***
Documentation    导航功能测试套件 - 验证基础页面导航和加载
Resource         ../resources/common.robot
Suite Teardown   Close Browser Safely

*** Test Cases ***
TC-NAV-001: 验证首页加载成功
    [Documentation]    验证目标站点首页可正常打开并显示正确标题
    [Tags]    smoke    navigation    P0
    Open Browser To Grid    https://example.com
    Verify Page Title Contains    Example Domain
    [Teardown]    Close Browser Safely

TC-NAV-002: 验证页面包含核心元素
    [Documentation]    验证页面 DOM 结构包含必要的 H1 和链接元素
    [Tags]    smoke    navigation    P0
    Open Browser To Grid    https://example.com
    Page Should Contain Element    xpath://h1
    Page Should Contain Element    xpath://a
    [Teardown]    Close Browser Safely

TC-NAV-003: 验证页面文本内容
    [Documentation]    验证页面包含预期文本内容
    [Tags]    regression    navigation    P1
    Open Browser To Grid    https://example.com
    Page Should Contain    This domain is for use in documentation examples
    [Teardown]    Close Browser Safely
