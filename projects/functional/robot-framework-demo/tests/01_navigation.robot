*** Settings ***
Documentation    导航功能测试套件 - 验证基础页面导航和加载
Resource         ../resources/common.robot
Suite Setup      Open Browser To Grid    http://target-web
Suite Teardown   Close Browser Safely

*** Test Cases ***
TC-NAV-001: 验证首页加载成功
    [Documentation]    验证目标站点首页可正常打开并显示正确标题
    [Tags]    smoke    navigation    P0
    Verify Page Title Contains    Example Domain

TC-NAV-002: 验证页面包含核心内容
    [Documentation]    验证页面包含 H1 标题文本和"More information"链接文本
    [Tags]    regression    navigation    P1
    Page Should Contain    Example Domain
    Page Should Contain    More information

TC-NAV-003: 验证页面文本内容
    [Documentation]    验证页面包含预期文本内容
    [Tags]    regression    navigation    P1
    Page Should Contain    This domain is for use in documentation examples
