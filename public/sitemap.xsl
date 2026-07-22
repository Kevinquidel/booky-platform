<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
    xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
    exclude-result-prefixes="sitemap">

    <xsl:output method="html" doctype-system="about:legacy-compat" encoding="UTF-8" indent="yes"/>

    <!-- Template for HTML Document -->
    <xsl:template match="/">
        <html>
            <head>
                <title>Sitemap</title>
                <style>
                    body { font-family: "Arial", sans-serif; margin: 20px; background-color: #f4f4f9; color: #333; }
                    h1 { color: #5a5a5a; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px 15px; }
                    th { background-color: #9c27b0; color: #fff; text-align: left; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                    a { text-decoration: none; color: #337ab7; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <h1>Xalysna Sitemap</h1>
                <table>
                    <thead>
                        <tr>
                            <th>URL</th>
                            <th>Priority</th>
                            <th>Change Frequency</th>
                            <th>Last Modified</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Ajustar las rutas de acceso para considerar los namespaces -->
                        <xsl:for-each select="sitemap:urlset/sitemap:url">
                            <tr>
                                <td>
                                    <a href="{sitemap:loc}">
                                        <xsl:value-of select="sitemap:loc"/>
                                    </a>
                                </td>
                                <td>
                                    <xsl:value-of select="sitemap:priority"/>
                                </td>
                                <td>
                                    <xsl:value-of select="sitemap:changefreq"/>
                                </td>
                                <td>
                                    <xsl:value-of select="sitemap:lastmod"/>
                                </td>
                            </tr>
                        </xsl:for-each>
                    </tbody>
                </table>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
