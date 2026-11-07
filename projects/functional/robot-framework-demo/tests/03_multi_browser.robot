*** Settings ***
Documentation    多浏览器兼容性测试套件 - 验证跨浏览器一致性
Resource         ../resources/common.robot
Suite Teardown   Close Browser Safely

*** Test Cases ***
TC-MB-001: Chrome 浏览器验证页面加载
    [Documentation]    使用 Chrome 浏览器验证页面正常加载
    [Tags]    cross-browser    chrome    P0
    Open Browser To Grid    https://example.com    chrome
    Verify Page Title Contains    Example Domain
    Page Should Contain    Example Domain
    [Teardown]    Close Browser Safely

TC-MB-002: Firefox 浏览器验证页面加载
    [Documentation]    使用 Firefox 浏览器验证页面正常加载
    [Tags]    cross-browser    firefox    P1
    Open Browser To Grid    https://example.com    firefox
    Verify Page Title Contains    Example Domain
    Page Should Contain    Example Domain
    [Teardown]    Close Browser Safely

TC-MB-003: 跨浏览器标题一致性验证
    [Documentation]    验证不同浏览器中页面标题保持一致
    [Tags]    cross-browser    consistency    P1
    Open Browser To Grid    https://example.com    chrome
    ${chrome_title}=    Get Title
    Close Browser Safely
    Open Browser To Grid    https://example.com    firefox
    ${firefox_title}=    Get Title
    Should Be Equal    ${chrome_title}    ${firefox_title}
    [Teardown]    Close Browser Safely
