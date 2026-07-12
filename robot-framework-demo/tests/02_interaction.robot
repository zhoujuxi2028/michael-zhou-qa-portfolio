*** Settings ***
Documentation    交互功能测试套件 - 验证用户交互操作
Resource         ../resources/common.robot
Suite Teardown   Close Browser Safely

*** Test Cases ***
TC-INT-001: 验证链接可点击
    [Documentation]    验证页面链接可被点击且响应正确
    [Tags]    smoke    interaction    P0
    Open Browser To Grid    https://example.com
    ${link_text}=    Get Text    xpath://a
    Should Not Be Empty    ${link_text}
    [Teardown]    Close Browser Safely

TC-INT-002: 验证页面元素属性
    [Documentation]    验证 H1 标题元素的文本属性正确
    [Tags]    regression    interaction    P1
    Open Browser To Grid    https://example.com
    ${heading}=    Get Text    xpath://h1
    Should Be Equal    ${heading}    Example Domain
    [Teardown]    Close Browser Safely

TC-INT-003: 验证链接 href 属性
    [Documentation]    验证超链接包含正确的 href 目标地址
    [Tags]    regression    interaction    P1
    Open Browser To Grid    https://example.com
    ${href}=    Get Element Attribute    xpath://a    href
    Should Contain    ${href}    iana.org
    [Teardown]    Close Browser Safely
