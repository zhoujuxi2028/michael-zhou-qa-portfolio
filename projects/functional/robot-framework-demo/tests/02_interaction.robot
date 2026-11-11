*** Settings ***
Documentation    交互功能测试套件 - 验证用户交互操作
Resource         ../resources/common.robot
Suite Teardown   Close Browser Safely

*** Test Cases ***
TC-INT-001: 验证链接可点击
    [Documentation]    验证页面链接可被点击且响应正确
    [Tags]    smoke    interaction    P0
    Open Browser To Grid    http://target-web
    ${link_text}=    Get Text    xpath://a
    Should Not Be Empty    ${link_text}
    [Teardown]    Close Browser Safely

TC-INT-002: 验证页面标题文本内容
    [Documentation]    验证页面包含正确的 H1 标题文本
    [Tags]    regression    interaction    P1
    Open Browser To Grid    http://target-web
    Page Should Contain    Example Domain
    [Teardown]    Close Browser Safely

TC-INT-003: 验证页面包含 IANA 链接
    [Documentation]    验证页面链接 href 指向 iana.org
    [Tags]    regression    interaction    P1
    Open Browser To Grid    http://target-web
    ${href}=    Get Element Attribute    xpath://a    href
    Should Contain    ${href}    iana.org
    [Teardown]    Close Browser Safely
